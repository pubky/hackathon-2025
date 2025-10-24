import { useState, useEffect } from 'react';
import { CheckCircle2, Share2, Eye, Clock, Check, History, Server, CheckCircle, AlertCircle, Download, Loader2, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { LogoutButton } from './LogoutButton';
import { ConsentSession, SessionTag, TagColor } from '../types';
import { getTimeRemaining, formatDateTime, formatPubkyShort, createCanonicalObject, hashCanonicalObject } from '../lib/consent';
import { ProofDetails } from './ProofDetails';
import { fetchUsernames } from '../utils/username';
import { supabase } from '../lib/supabase';
import { TagDisplay } from './TagDisplay';
import { TagSelector } from './TagSelector';
import { useAuth } from '../contexts/AuthContext';
import { getHomeserverStorageStatus, storeAgreementOnCurrentUserHomeserver, DetailedError } from '../lib/homeserverStorage';
import { useSession } from '../contexts/SessionContext';
import { SessionExpiredError } from '../lib/pubky';
import QRCode from 'qrcode';

interface ActiveSessionProps {
  session: ConsentSession;
  onExpired: () => void;
  onClose: () => void;
  onGoToMySessions?: () => void;
}

export function ActiveSession({ session, onExpired, onClose, onGoToMySessions }: ActiveSessionProps) {
  const { session: authSession } = useAuth();
  const { refreshSession } = useSession();
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(session.window_end));
  const [showProof, setShowProof] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(session.status);
  const [usernames, setUsernames] = useState<Record<string, string | null>>({});
  const [tags, setTags] = useState<SessionTag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [isSavingToHomeserver, setIsSavingToHomeserver] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [localSession, setLocalSession] = useState(session);
  const [detailedError, setDetailedError] = useState<DetailedError | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [debugInfoCopied, setDebugInfoCopied] = useState(false);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [reauthQRCode, setReauthQRCode] = useState<string | null>(null);
  const [isReauthenticating, setIsReauthenticating] = useState(false);
  const [isCompletingSave, setIsCompletingSave] = useState(false);
  const [pendingOperation, setPendingOperation] = useState<(() => Promise<void>) | null>(null);
  const { signIn } = useAuth();

  useEffect(() => {
    setLocalSession(session);
  }, [session]);

  useEffect(() => {
    const pubkeys = [localSession.a_pubky];
    if (localSession.b_pubky) pubkeys.push(localSession.b_pubky);
    fetchUsernames(pubkeys).then(setUsernames);
  }, [localSession]);

  useEffect(() => {
    loadTags();

    const channel = supabase
      .channel(`session-tags-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_tags',
          filter: `session_id=eq.${session.id}`
        },
        () => {
          loadTags();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [session.id]);

  const loadTags = async () => {
    try {
      const { data, error } = await supabase
        .from('session_tags')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('[ActiveSession] Error loading tags:', error);
    } finally {
      setIsLoadingTags(false);
    }
  };

  const handleAddTag = async (tagText: string, tagColor: TagColor) => {
    if (!authSession?.pubky) {
      throw new Error('Not authenticated');
    }

    const { error } = await supabase
      .from('session_tags')
      .insert({
        session_id: session.id,
        tag_text: tagText,
        tag_color: tagColor,
        created_by_pubky: authSession.pubky
      });

    if (error) {
      throw error;
    }

    await loadTags();
  };

  const handleRemoveTag = async (tagId: string) => {
    const { error } = await supabase
      .from('session_tags')
      .delete()
      .eq('id', tagId);

    if (error) {
      console.error('[ActiveSession] Error removing tag:', error);
      return;
    }

    await loadTags();
  };

  const handleSaveToHomeserver = async () => {
    if (!authSession?.pubky) {
      setSaveError('Not authenticated. Please sign in again.');
      setDetailedError(null);
      return;
    }

    setIsSavingToHomeserver(true);
    setSaveError(null);
    setSaveSuccess(false);
    setDetailedError(null);
    setShowDebugInfo(false);

    try {
      const canonicalObj = createCanonicalObject(
        localSession.id,
        localSession.a_pubky,
        localSession.b_pubky!,
        localSession.statement_hash,
        localSession.window_start,
        localSession.window_end
      );

      const canonicalHash = await hashCanonicalObject(canonicalObj);

      const result = await storeAgreementOnCurrentUserHomeserver(
        localSession,
        canonicalObj,
        canonicalHash
      );

      if (!result.success) {
        if (result.detailedError) {
          setDetailedError(result.detailedError);
        }
        throw new Error(result.error || 'Failed to save to homeserver');
      }

      const isPersonA = localSession.a_pubky === authSession.pubky;
      const updateData: any = {};

      if (isPersonA) {
        updateData.a_homeserver_stored = true;
        updateData.a_homeserver_url = result.url;
      } else {
        updateData.b_homeserver_stored = true;
        updateData.b_homeserver_url = result.url;
      }

      const bothStored = isPersonA
        ? updateData.a_homeserver_stored && localSession.b_homeserver_stored
        : localSession.a_homeserver_stored && updateData.b_homeserver_stored;

      if (bothStored && !localSession.homeserver_stored_at) {
        updateData.homeserver_stored_at = new Date().toISOString();
      }

      const { error: dbError } = await supabase
        .from('consent_sessions')
        .update(updateData)
        .eq('id', localSession.id);

      if (dbError) {
        console.error('[ActiveSession] Database update failed:', dbError);
        throw new Error('Saved to homeserver but failed to update database');
      }

      setSaveSuccess(true);
      await refreshSession();

      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (error) {
      console.error('[ActiveSession] Failed to save to homeserver:', error);

      const isSessionExpired = error instanceof SessionExpiredError ||
        (error instanceof Error && error.name === 'SessionExpiredError') ||
        (error instanceof Error && error.message.includes('session has expired'));

      if (isSessionExpired) {
        console.log('[ActiveSession] Session expired detected, triggering re-authentication');
        setPendingOperation(() => handleSaveToHomeserver);
        await initiateReauth();
      } else {
        setSaveError(error instanceof Error ? error.message : 'Unknown error occurred');
      }
    } finally {
      setIsSavingToHomeserver(false);
    }
  };

  const initiateReauth = async () => {
    try {
      setIsReauthenticating(true);
      setShowReauthModal(true);
      setSaveError(null);
      setDetailedError(null);

      console.log('[ActiveSession] Starting re-authentication flow');
      const { authURL, waitForResponse } = await signIn();

      console.log('[ActiveSession] Auth URL generated, creating QR code');
      const qrDataUrl = await QRCode.toDataURL(authURL, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      setReauthQRCode(qrDataUrl);
      console.log('[ActiveSession] QR code generated, waiting for user to scan');

      await waitForResponse();

      console.log('[ActiveSession] Re-authentication successful, session updated');
      setIsReauthenticating(false);

      if (pendingOperation) {
        console.log('[ActiveSession] Re-authentication complete, now executing pending save operation');
        setIsCompletingSave(true);

        try {
          const operation = pendingOperation;
          setPendingOperation(null);
          await operation();

          console.log('[ActiveSession] Pending operation completed successfully after re-authentication');

          const { data: updatedSession } = await supabase
            .from('consent_sessions')
            .select('*')
            .eq('id', localSession.id)
            .single();

          if (updatedSession) {
            setLocalSession(updatedSession);
          }

          setIsCompletingSave(false);
          setShowReauthModal(false);
          setReauthQRCode(null);
        } catch (error) {
          console.error('[ActiveSession] Failed to complete pending operation after re-authentication:', error);
          setIsCompletingSave(false);
          setShowReauthModal(false);
          setReauthQRCode(null);
          setSaveError(error instanceof Error ? error.message : 'Failed to complete save operation');
        }
      } else {
        setShowReauthModal(false);
        setReauthQRCode(null);
      }
    } catch (error) {
      console.error('[ActiveSession] Re-authentication failed:', error);
      setSaveError('Re-authentication failed. Please try again.');
      setShowReauthModal(false);
      setReauthQRCode(null);
      setIsReauthenticating(false);
      setPendingOperation(null);
    }
  };

  const handleCancelReauth = () => {
    setShowReauthModal(false);
    setReauthQRCode(null);
    setIsReauthenticating(false);
    setPendingOperation(null);
    setSaveError('Authentication cancelled. Please try again when ready.');
  };

  const handleCopyDebugInfo = async () => {
    if (!detailedError) return;

    const debugInfo = {
      error: detailedError,
      session: {
        id: localSession.id,
        a_pubky: localSession.a_pubky,
        b_pubky: localSession.b_pubky,
        status: localSession.status
      },
      user: {
        pubky: authSession?.pubky,
        isPersonA: localSession.a_pubky === authSession?.pubky,
        isPersonB: localSession.b_pubky === authSession?.pubky
      },
      timestamp: new Date().toISOString()
    };

    await navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    setDebugInfoCopied(true);
    setTimeout(() => setDebugInfoCopied(false), 2000);
  };

  useEffect(() => {
    setCurrentStatus(session.status);
  }, [session.status]);

  useEffect(() => {
    if (!localSession) return;

    const channel = supabase
      .channel(`homeserver-storage-${localSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'consent_sessions',
          filter: `id=eq.${localSession.id}`
        },
        (payload) => {
          if (payload.new) {
            const updated = payload.new as ConsentSession;
            console.log('[ActiveSession] Homeserver storage updated via real-time:', {
              a_homeserver_stored: updated.a_homeserver_stored,
              b_homeserver_stored: updated.b_homeserver_stored,
              a_homeserver_url: updated.a_homeserver_url,
              b_homeserver_url: updated.b_homeserver_url
            });
            setLocalSession(updated);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [localSession.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = getTimeRemaining(session.window_end);
      setTimeLeft(remaining);

      if (remaining.total <= 0 || currentStatus === 'expired') {
        clearInterval(timer);
        onExpired();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session.window_end, currentStatus, onExpired]);

  const shareUrl = `${window.location.origin}?session=${session.id}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ConsentKy Consent Session',
          text: 'View this active consent session',
          url: shareUrl
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('[ActiveSession] Share error:', error);
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isExpired = timeLeft.total <= 0 || currentStatus === 'expired';
  const isExpiringSoon = timeLeft.total > 0 && timeLeft.total <= 300 && currentStatus !== 'expired';
  const hasBothParticipants = localSession.a_authentication && localSession.b_authentication && localSession.status === 'active';

  const isPersonA = authSession?.pubky === localSession.a_pubky;
  const isPersonB = authSession?.pubky === localSession.b_pubky;
  const currentUserHasSaved = isPersonA ? localSession.a_homeserver_stored : localSession.b_homeserver_stored;
  const canSaveToHomeserver = hasBothParticipants && !currentUserHasSaved && authSession?.pubky;

  return (
    <>
      <div className="h-screen flex flex-col bg-warm-50">
        <nav className="bg-white border-b border-warm-200 sticky top-0 z-10 shadow-soft">
          <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-sm font-bold text-warm-900">ConsentKy</h1>
            </div>
            <LogoutButton />
          </div>
        </nav>
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="bg-white rounded-xl shadow-soft-lg border border-warm-200 overflow-hidden">
              <div className={`px-4 py-3 ${
                isExpired
                  ? 'bg-warm-600'
                  : 'bg-emerald-500'
              }`}>
                <h2 className="text-lg font-bold text-white">
                  {isExpired ? 'Session Expired' : 'Active Consent Session'}
                </h2>
                <p className="text-white text-opacity-95 text-xs mt-1">
                  {isExpired ? 'Consent window has ended' : 'Consent is active and verified'}
                </p>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  {isExpired ? (
                    <div className="w-2 h-2 rounded-full bg-warm-500" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                  <span className={`text-xs font-bold ${
                    isExpired ? 'text-warm-700' : 'text-emerald-700'
                  }`}>
                    {isExpired ? 'Expired' : 'Active'}
                  </span>
                </div>

                <div className="bg-warm-50 border-2 border-warm-200 rounded-xl p-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1.5 mb-2">
                      <Clock className={`w-4 h-4 ${
                        isExpired ? 'text-warm-500' : isExpiringSoon ? 'text-amber-600' : 'text-emerald-600'
                      }`} />
                      <p className="text-xs font-bold text-warm-700">
                        {isExpired ? 'Time Elapsed' : 'Time Remaining'}
                      </p>
                    </div>
                    <div className={`text-5xl font-bold mb-2 ${
                      isExpired ? 'text-warm-600' : isExpiringSoon ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                    </div>
                    <p className="text-[10px] text-warm-600">
                      {isExpired ? 'Ended at' : 'Until'} {formatDateTime(session.window_end)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 text-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1.5" />
                    <p className="text-[10px] font-bold text-emerald-900 mb-0.5">Both Signed</p>
                    <p className="text-[9px] text-emerald-700">Verified</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-2 text-center">
                    <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1.5" />
                    <p className="text-[10px] font-bold text-blue-900 mb-0.5">Duration</p>
                    <p className="text-[9px] text-blue-700">{session.window_duration_minutes} min</p>
                  </div>
                </div>

                <div className="bg-warm-50 border border-warm-200 rounded-xl p-2 space-y-2 max-h-[15vh] overflow-y-auto">
                  <div>
                    <p className="text-xs font-bold text-warm-700 mb-1.5">Participants</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          {usernames[session.a_pubky] && (
                            <span className="text-[10px] text-warm-900 font-semibold block">@{usernames[session.a_pubky]}</span>
                          )}
                          <code className="text-[10px] text-warm-800 font-mono block">
                            {formatPubkyShort(session.a_pubky)}
                          </code>
                          {localSession.a_homeserver_url && (
                            <code className="text-[8px] text-blue-700 font-mono block mt-0.5 break-all leading-tight">
                              {localSession.a_homeserver_url}
                            </code>
                          )}
                        </div>
                        <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold flex-shrink-0 ml-2">
                          Signed
                        </span>
                      </div>
                      {session.b_pubky && (
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            {usernames[session.b_pubky] && (
                              <span className="text-[10px] text-warm-900 font-semibold block">@{usernames[session.b_pubky]}</span>
                            )}
                            <code className="text-[10px] text-warm-800 font-mono block">
                              {formatPubkyShort(session.b_pubky)}
                            </code>
                            {localSession.b_homeserver_url && (
                              <code className="text-[8px] text-blue-700 font-mono block mt-0.5 break-all leading-tight">
                                {localSession.b_homeserver_url}
                              </code>
                            )}
                          </div>
                          <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold flex-shrink-0 ml-2">
                            Signed
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {hasBothParticipants && (() => {
                  const storageStatus = getHomeserverStorageStatus(localSession);
                  return (
                    <div className={`border-2 rounded-xl p-3 ${
                      storageStatus.isFullyStored
                        ? 'bg-blue-50 border-blue-300'
                        : storageStatus.isPartiallyStored
                        ? 'bg-amber-50 border-amber-300'
                        : 'bg-slate-50 border-slate-300'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Server className={`w-4 h-4 ${
                            storageStatus.isFullyStored
                              ? 'text-blue-600'
                              : storageStatus.isPartiallyStored
                              ? 'text-amber-600'
                              : 'text-slate-600'
                          }`} />
                          <h4 className="text-xs font-bold text-slate-900">
                            Homeserver Backup
                          </h4>
                        </div>
                        {canSaveToHomeserver && (
                          <button
                            onClick={handleSaveToHomeserver}
                            disabled={isSavingToHomeserver}
                            className="flex items-center space-x-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-[10px] font-bold transition-colors"
                          >
                            {isSavingToHomeserver ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-3 h-3" />
                                <span>Save to My Homeserver</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {saveSuccess && (
                        <div className="mb-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-start space-x-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-emerald-900 font-bold">Saved Successfully!</p>
                            <p className="text-[9px] text-emerald-800 mt-0.5">Your agreement is now backed up on your homeserver.</p>
                          </div>
                        </div>
                      )}

                      {saveError && (
                        <div className="mb-2 bg-red-50 border border-red-200 rounded-lg p-2">
                          <div className="flex items-start space-x-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-[10px] text-red-900 font-bold">Save Failed</p>
                              <p className="text-[9px] text-red-800 mt-0.5">{saveError}</p>

                              {detailedError && (
                                <div className="mt-2">
                                  <button
                                    onClick={() => setShowDebugInfo(!showDebugInfo)}
                                    className="flex items-center space-x-1 text-[9px] text-red-700 hover:text-red-900 font-medium"
                                  >
                                    {showDebugInfo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    <span>{showDebugInfo ? 'Hide' : 'Show'} Debug Info</span>
                                  </button>

                                  {showDebugInfo && (
                                    <div className="mt-2 p-2 bg-red-100 rounded border border-red-300 space-y-1">
                                      {detailedError.httpStatus && (
                                        <div className="text-[8px]">
                                          <span className="font-bold text-red-800">HTTP Status:</span>
                                          <span className="text-red-700 ml-1">{detailedError.httpStatus}</span>
                                        </div>
                                      )}
                                      {detailedError.errorType && (
                                        <div className="text-[8px]">
                                          <span className="font-bold text-red-800">Error Type:</span>
                                          <span className="text-red-700 ml-1">{detailedError.errorType}</span>
                                        </div>
                                      )}
                                      <div className="text-[8px]">
                                        <span className="font-bold text-red-800">Timestamp:</span>
                                        <span className="text-red-700 ml-1">{new Date(detailedError.timestamp).toLocaleString()}</span>
                                      </div>
                                      {detailedError.stack && (
                                        <div className="text-[8px] mt-2">
                                          <span className="font-bold text-red-800 block mb-1">Stack Trace:</span>
                                          <pre className="text-red-700 whitespace-pre-wrap break-all font-mono bg-white p-1 rounded border border-red-200 max-h-20 overflow-y-auto">
                                            {detailedError.stack}
                                          </pre>
                                        </div>
                                      )}
                                      <button
                                        onClick={handleCopyDebugInfo}
                                        className="mt-2 flex items-center space-x-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[8px] font-bold"
                                      >
                                        {debugInfoCopied ? (
                                          <>
                                            <Check className="w-2.5 h-2.5" />
                                            <span>Copied!</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-2.5 h-2.5" />
                                            <span>Copy Debug Info</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        {!storageStatus.isFullyStored && !storageStatus.isPartiallyStored && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                            <p className="text-[10px] text-blue-900 font-medium">
                              Save this agreement to your personal homeserver for permanent backup.
                            </p>
                          </div>
                        )}

                        {storageStatus.isFullyStored && (
                          <div className="flex items-start space-x-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-[10px] text-slate-800 font-medium">
                                Fully backed up on both homeservers
                              </p>
                              {localSession.homeserver_stored_at && (
                                <p className="text-[9px] text-slate-600 mt-0.5">
                                  Completed at {formatDateTime(localSession.homeserver_stored_at)}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between bg-white border rounded-lg p-2 border-slate-200">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-1.5 mb-0.5">
                                <p className="text-[9px] text-slate-600 font-medium">
                                  {usernames[localSession.a_pubky] ? `@${usernames[localSession.a_pubky]}` : 'Person A'}
                                </p>
                                {isPersonA && <span className="text-[8px] text-blue-600 font-bold">(You)</span>}
                              </div>
                              <code className="text-[8px] text-slate-500 font-mono break-all block leading-tight mb-1">
                                {localSession.a_pubky}/pub/consentky.app/agreements/{localSession.id}
                              </code>
                              {localSession.a_homeserver_url ? (
                                <div className="flex items-start space-x-1">
                                  <CheckCircle className="w-2.5 h-2.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                  <code className="text-[8px] text-emerald-700 font-mono break-all block leading-tight">
                                    {localSession.a_homeserver_url}
                                  </code>
                                </div>
                              ) : (
                                <p className="text-[8px] text-slate-500 italic">Not saved yet</p>
                              )}
                            </div>
                            <div className="ml-2 flex-shrink-0">
                              {localSession.a_homeserver_stored ? (
                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between bg-white border rounded-lg p-2 border-slate-200">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-1.5 mb-0.5">
                                <p className="text-[9px] text-slate-600 font-medium">
                                  {usernames[localSession.b_pubky!] ? `@${usernames[localSession.b_pubky!]}` : 'Person B'}
                                </p>
                                {isPersonB && <span className="text-[8px] text-blue-600 font-bold">(You)</span>}
                              </div>
                              {localSession.b_pubky && (
                                <code className="text-[8px] text-slate-500 font-mono break-all block leading-tight mb-1">
                                  {localSession.b_pubky}/pub/consentky.app/agreements/{localSession.id}
                                </code>
                              )}
                              {localSession.b_homeserver_url ? (
                                <div className="flex items-start space-x-1">
                                  <CheckCircle className="w-2.5 h-2.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                  <code className="text-[8px] text-emerald-700 font-mono break-all block leading-tight">
                                    {localSession.b_homeserver_url}
                                  </code>
                                </div>
                              ) : (
                                <p className="text-[8px] text-slate-500 italic">Not saved yet</p>
                              )}
                            </div>
                            <div className="ml-2 flex-shrink-0">
                              {localSession.b_homeserver_stored ? (
                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {hasBothParticipants && !isExpired && (
                  <div className="space-y-2">
                    <div className="bg-warm-50 border border-warm-200 rounded-xl p-2">
                      <p className="text-xs font-bold text-warm-700 mb-1.5">Session Tags</p>
                      {isLoadingTags ? (
                        <div className="text-[10px] text-warm-600">Loading tags...</div>
                      ) : (
                        <div className="space-y-2">
                          <TagDisplay
                            tags={tags}
                            onRemoveTag={handleRemoveTag}
                            canEdit={true}
                            size="md"
                          />
                          {tags.length === 0 && (
                            <p className="text-[10px] text-warm-600 italic">No tags yet. Add up to 3 tags to personalize this session.</p>
                          )}
                          <TagSelector
                            onAddTag={handleAddTag}
                            currentTagCount={tags.length}
                            maxTags={3}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!isExpired && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-2">
                    <p className="text-[10px] text-amber-900 leading-snug">
                      <span className="font-bold">No revocation:</span> Consent remains active until timer expires.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowProof(true)}
                    className="px-3 py-2 bg-warm-100 hover:bg-warm-200 text-warm-900 font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 shadow-soft hover:shadow-soft-md text-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Proof</span>
                  </button>
                  <button
                    onClick={handleShare}
                    className="px-3 py-2 bg-coral-500 hover:bg-coral-600 text-white font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 shadow-soft hover:shadow-soft-md text-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share</span>
                      </>
                    )}
                  </button>
                </div>

                {hasBothParticipants && onGoToMySessions && (
                  <button
                    onClick={onGoToMySessions}
                    className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 shadow-soft hover:shadow-soft-md text-xs"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Go to My Sessions</span>
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="w-full px-4 py-2 border-2 border-warm-300 text-warm-900 font-bold rounded-xl hover:bg-warm-50 transition-all text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showProof && (
        <ProofDetails
          session={session}
          onClose={() => setShowProof(false)}
        />
      )}

      {showReauthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-4">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-warm-900 mb-2">
                Session Expired
              </h3>
              <p className="text-sm text-warm-700">
                Your authentication session has expired. Please re-authenticate to continue saving to your homeserver.
              </p>
            </div>

            {isCompletingSave ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
                  <div className="flex flex-col items-center space-y-3">
                    <CheckCircle className="w-12 h-12 text-emerald-600" />
                    <p className="text-sm font-bold text-emerald-900">
                      Authentication Successful!
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <p className="text-xs text-warm-700 font-medium">
                    Completing save to homeserver...
                  </p>
                </div>
              </div>
            ) : reauthQRCode ? (
              <div className="space-y-4">
                <div className="bg-warm-50 border-2 border-warm-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-warm-800 mb-3 text-center">
                    Scan this QR code with your Pubky app
                  </p>
                  <div className="flex justify-center">
                    <img
                      src={reauthQRCode}
                      alt="Re-authentication QR Code"
                      className="rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <p className="text-xs text-warm-700">
                    Waiting for authentication...
                  </p>
                </div>

                <button
                  onClick={handleCancelReauth}
                  disabled={isReauthenticating}
                  className="w-full px-4 py-2 border-2 border-warm-300 text-warm-900 font-bold rounded-xl hover:bg-warm-50 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
