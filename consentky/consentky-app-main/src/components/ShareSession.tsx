import { useState, useEffect } from 'react';
import { Copy, Check, Clock, User, X, Smartphone, Volume2 } from 'lucide-react';
import { LogoutButton } from './LogoutButton';
import { QRCodeCanvas } from './QRCodeCanvas';
import { supabase } from '../lib/supabase';
import { ConsentSession } from '../types';
import { formatPubkyShort, formatTime } from '../lib/consent';
import { fetchUsernames } from '../utils/username';
import { audioService } from '../utils/audioService';
import { AudioToggle } from './AudioToggle';
import { convertToRingURL } from '../utils/deepLink';

interface ShareSessionProps {
  sessionId: string;
  userPubky: string;
  onBothSigned: (session: ConsentSession) => void;
  onSignAgreement?: (session: ConsentSession) => void;
  onCancel: () => void;
}

export function ShareSession({ sessionId, userPubky, onBothSigned, onSignAgreement, onCancel }: ShareSessionProps) {
  const [session, setSession] = useState<ConsentSession | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedSessionId, setCopiedSessionId] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isPartnerView, setIsPartnerView] = useState(false);
  const [usernames, setUsernames] = useState<Record<string, string | null>>({});
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  useEffect(() => {
    loadSession();
    generateQRUrl();

    // Check if this is the partner viewing the link
    const urlParams = new URLSearchParams(window.location.search);
    const utmSource = urlParams.get('utm_source');
    setIsPartnerView(utmSource === 'partner');

    // Sync music state with audioService on mount
    setIsMusicPlaying(audioService.isPlayingMusic());
  }, [sessionId]);

  useEffect(() => {
    if (!session) return;

    if (session.a_authentication && session.b_authentication && session.status === 'active') {
      onBothSigned(session);
      return;
    }

    const pollInterval = setInterval(() => {
      pollForUpdates();
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [session]);

  useEffect(() => {
    if (session) {
      const pubkeys = [session.a_pubky];
      if (session.b_pubky) pubkeys.push(session.b_pubky);
      fetchUsernames(pubkeys).then(setUsernames);
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;

    const isCreator = session.a_pubky === userPubky;
    const hasPartnerJoined = !!session.b_pubky;
    const userHasSigned = isCreator ? !!session.a_authentication : !!session.b_authentication;
    const partnerHasSigned = isCreator ? !!session.b_authentication : !!session.a_authentication;
    const bothSigned = userHasSigned && partnerHasSigned;

    // Play music when:
    // 1. Creator is waiting for partner to join (no partner yet)
    // 2. Waiting for partner to sign (partner joined but hasn't signed)
    // Stop music when:
    // - Both parties have signed
    const shouldPlayMusic = !bothSigned && ((!hasPartnerJoined && isCreator) || (hasPartnerJoined && userHasSigned && !partnerHasSigned));

    console.log('[ShareSession] Music logic:', {
      isCreator,
      hasPartnerJoined,
      userHasSigned,
      partnerHasSigned,
      bothSigned,
      shouldPlayMusic,
      isMusicPlaying,
      a_authentication: session.a_authentication ? 'present' : 'absent',
      b_authentication: session.b_authentication ? 'present' : 'absent'
    });

    if (shouldPlayMusic && !isMusicPlaying) {
      console.log('[ShareSession] Starting waiting music...');
      audioService.startWaitingMusic();
      setIsMusicPlaying(true);
    } else if (!shouldPlayMusic && isMusicPlaying) {
      console.log('[ShareSession] Stopping waiting music...');
      audioService.stopWaitingMusic(true);
      setIsMusicPlaying(false);
    }

    return () => {
      if (isMusicPlaying) {
        audioService.stopWaitingMusic(true);
        setIsMusicPlaying(false);
      }
    };
  }, [session, userPubky, isMusicPlaying]);

  const loadSession = async () => {
    try {
      const { data, error } = await supabase
        .from('consent_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      setSession(data);
    } catch (error) {
      console.error('[ShareSession] Error loading session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateQRUrl = async () => {
    try {
      console.log('[ShareSession] Generating share URL for session:', sessionId);

      const { data: pendingJoin, error } = await supabase
        .from('pending_session_joins')
        .insert({ session_id: sessionId })
        .select('id, session_id, created_at, expires_at')
        .single();

      if (error) {
        console.error('[ShareSession] Error creating pending join:', error);
        throw error;
      }

      const joinUrl = `${window.location.origin}?pendingJoin=${pendingJoin.id}&utm_source=partner`;
      setShareUrl(joinUrl);
      console.log('[ShareSession] Generated share URL:', {
        pendingJoinId: pendingJoin.id,
        sessionId: pendingJoin.session_id,
        joinUrl,
        expiresAt: pendingJoin.expires_at,
        origin: window.location.origin
      });
    } catch (error) {
      console.error('[ShareSession] Error generating share URL, falling back to direct join URL:', error);
      const fallbackUrl = `${window.location.origin}?join=${sessionId}&utm_source=partner`;
      setShareUrl(fallbackUrl);
    }
  };

  const pollForUpdates = async () => {
    try {
      const { data, error } = await supabase
        .from('consent_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      setSession(data);

      if (data.a_authentication && data.b_authentication) {
        console.log('[ShareSession] Both signatures detected, status:', data.status);
        if (data.status === 'active') {
          if (isMusicPlaying) {
            audioService.stopWaitingMusic(true);
            setIsMusicPlaying(false);
          }
          onBothSigned(data);
        }
      }
    } catch (error) {
      console.error('[ShareSession] Error polling session:', error);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySessionId = async () => {
    await navigator.clipboard.writeText(sessionId);
    setCopiedSessionId(true);
    setTimeout(() => setCopiedSessionId(false), 2000);
  };


  if (isLoading) {
    return (
      <div className="h-screen bg-warm-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-coral-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-warm-600 text-sm">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-screen bg-warm-50 flex items-center justify-center">
        <div className="text-center text-warm-600">
          <p className="text-sm">Session not found</p>
        </div>
      </div>
    );
  }

  const isCreator = session.a_pubky === userPubky;
  const hasPartnerJoined = !!session.b_pubky;
  const userHasSigned = isCreator ? !!session.a_authentication : !!session.b_authentication;
  const partnerHasSigned = isCreator ? !!session.b_authentication : !!session.a_authentication;

  return (
    <div className="h-screen flex flex-col bg-warm-50">
      <nav className="bg-white border-b border-warm-200 sticky top-0 z-10 shadow-soft">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-sm font-bold text-warm-900">ConsentKy</h1>
            {usernames[userPubky] && (
              <div className="flex items-center space-x-1 mt-0.5">
                <User className="w-3 h-3 text-warm-600" />
                <p className="text-[10px] text-warm-600 font-medium">@{usernames[userPubky]}</p>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <AudioToggle />
            <LogoutButton />
          </div>
        </div>
      </nav>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="bg-white rounded-xl shadow-soft-lg border border-warm-200 overflow-hidden">
            <div className="bg-coral-500 px-4 py-3">
              <h2 className="text-lg font-bold text-white">
                {hasPartnerJoined ? 'Partner Joined' : 'Share Session'}
              </h2>
              <p className="text-white text-opacity-95 text-xs mt-1">
                {hasPartnerJoined
                  ? 'Waiting for signatures to complete'
                  : 'Share this with your partner to join'}
              </p>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center justify-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  (!hasPartnerJoined || !userHasSigned) ? 'animate-pulse bg-coral-500' :
                  (userHasSigned && !partnerHasSigned) ? 'animate-pulse bg-amber-500' :
                  'bg-emerald-500'
                }`} />
                <span className="text-xs font-bold text-warm-800">
                  {!hasPartnerJoined ? 'Waiting for Partner. Scan with camera or ConsentKy' :
                   !userHasSigned ? 'Please sign the agreement' :
                   !partnerHasSigned ? 'Waiting for partner to sign' :
                   'Both parties have signed'}
                </span>
                {isMusicPlaying && (
                  <Volume2 className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                )}
              </div>

              {!hasPartnerJoined && (
                <>
                  <div className="flex flex-col items-center">
                    <div className="bg-white p-3 rounded-xl border-2 border-warm-200 shadow-soft">
                      {shareUrl ? (
                        <QRCodeCanvas value={shareUrl} size={180} />
                      ) : (
                        <div className="flex items-center justify-center" style={{ width: 180, height: 180 }}>
                          <div className="w-6 h-6 border-4 border-coral-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>

                    <div className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-semibold text-slate-600">Session Link</p>
                        <button
                          onClick={handleCopyLink}
                          disabled={!shareUrl}
                          className="px-2 py-0.5 bg-slate-700 hover:bg-slate-800 text-white text-[10px] font-medium rounded transition-colors flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        placeholder="Generating link..."
                        className="w-full text-[9px] text-slate-800 font-mono bg-white border border-slate-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-text"
                      />
                    </div>
                  </div>

                  {shareUrl && isPartnerView && (
                    <>
                      <div className="flex items-center justify-center space-x-1.5 text-warm-600">
                        <Smartphone className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-medium">Tap to open in mobile app:</span>
                      </div>

                      <a
                        href={convertToRingURL(shareUrl)}
                        className="block w-full text-center bg-warm-100 hover:bg-warm-200 text-warm-900 font-bold py-2 px-3 rounded-xl transition-all border border-warm-200 text-xs"
                      >
                        Open in Pubky Ring App
                      </a>
                    </>
                  )}

                  <div className="max-h-[15vh] overflow-y-auto space-y-2">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-semibold text-slate-600">Session ID</p>
                        <button
                          onClick={handleCopySessionId}
                          className="px-2 py-0.5 bg-slate-700 hover:bg-slate-800 text-white text-[10px] font-medium rounded transition-colors flex items-center space-x-1"
                        >
                          {copiedSessionId ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <code className="text-3xl text-slate-900 break-all font-mono font-bold tracking-wider">
                        {sessionId}
                      </code>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                      <p className="text-[10px] text-blue-900 leading-snug">
                        <span className="font-semibold">For partners:</span> Scan QR to open session, authenticate with Pubky Ring, and sign.
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-2 max-h-[20vh] overflow-y-auto">
                <div>
                  <p className="text-[10px] font-semibold text-slate-600 mb-1">Duration</p>
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] text-slate-800 font-medium">
                      {session.window_duration_minutes} minutes
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-slate-600 mb-1">Starts at</p>
                  <span className="text-[10px] text-slate-800">
                    {formatTime(session.window_start)}
                  </span>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-slate-600 mb-1">
                    {isCreator ? 'Your Key' : 'Creator Key'}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <User className="w-3 h-3 text-slate-500" />
                      <div className="flex flex-col">
                        {usernames[session.a_pubky] && (
                          <span className="text-[10px] text-slate-900 font-semibold">@{usernames[session.a_pubky]}</span>
                        )}
                        <code className="text-[9px] text-slate-700 font-mono">
                          {formatPubkyShort(session.a_pubky)}
                        </code>
                      </div>
                    </div>
                    {session.a_authentication && (
                      <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                        Signed
                      </span>
                    )}
                  </div>
                </div>

                {hasPartnerJoined && session.b_pubky && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-600 mb-1">
                      {isCreator ? 'Partner Key' : 'Your Key'}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <User className="w-3 h-3 text-slate-500" />
                        <div className="flex flex-col">
                          {usernames[session.b_pubky] && (
                            <span className="text-[10px] text-slate-900 font-semibold">@{usernames[session.b_pubky]}</span>
                          )}
                          <code className="text-[9px] text-slate-700 font-mono">
                            {formatPubkyShort(session.b_pubky)}
                          </code>
                        </div>
                      </div>
                      {session.b_authentication && (
                        <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                          Signed
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 max-h-[15vh] overflow-y-auto">
                <p className="text-[10px] text-blue-900 leading-snug">
                  {session.consent_statement}
                </p>
              </div>

              {!userHasSigned && hasPartnerJoined && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 space-y-2">
                  <p className="text-[10px] text-blue-900">
                    You haven't signed yet. Review and sign the agreement.
                  </p>
                  {onSignAgreement && (
                    <button
                      onClick={() => onSignAgreement(session)}
                      className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-xs"
                    >
                      Review and Sign
                    </button>
                  )}
                </div>
              )}


              {userHasSigned && partnerHasSigned && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                  <p className="text-[10px] text-green-900 font-medium">
                    Both parties signed! Redirecting to active session...
                  </p>
                </div>
              )}

              <button
                onClick={onCancel}
                className="w-full px-4 py-2 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center space-x-1.5 text-xs"
              >
                <X className="w-3.5 h-3.5" />
                <span>{userHasSigned && !partnerHasSigned ? 'Return Home' : 'Cancel'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
