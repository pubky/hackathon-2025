import { useState, useEffect } from 'react';
import { FileCheck, Clock, User, AlertCircle, CheckCircle } from 'lucide-react';
import { LogoutButton } from './LogoutButton';
import { ConsentSession } from '../types';
import { formatPubkyShort, formatDateTime, createCanonicalObject, hashCanonicalObject } from '../lib/consent';
import { fetchUsernames } from '../utils/username';
import { supabase } from '../lib/supabase';
import sodium from 'libsodium-wrappers';
import { ensureSodiumReady, generateMockSignature } from '../lib/crypto';
import { audioService } from '../utils/audioService';
import { AudioToggle } from './AudioToggle';

interface ReviewAndSignProps {
  session: ConsentSession;
  userPubky: string;
  onSigned: (session: ConsentSession) => void;
  onCancel: () => void;
}

export function ReviewAndSign({ session, userPubky, onSigned, onCancel }: ReviewAndSignProps) {
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernames, setUsernames] = useState<Record<string, string | null>>({});

  useEffect(() => {
    console.log('[ReviewAndSign] Component mounted/updated with session:', {
      sessionId: session?.id,
      hasConsentStatement: !!session?.consent_statement,
      consentStatementPreview: session?.consent_statement?.substring(0, 50),
      windowDuration: session?.window_duration_minutes,
      aPubky: session?.a_pubky ? `${session.a_pubky.substring(0, 20)}...` : 'MISSING',
      bPubky: session?.b_pubky ? `${session.b_pubky.substring(0, 20)}...` : 'not set',
      userPubky: userPubky ? `${userPubky.substring(0, 20)}...` : 'MISSING'
    });
  }, [session, userPubky]);

  useEffect(() => {
    if (!session) {
      console.error('[ReviewAndSign] Session is null or undefined!');
      return;
    }
    const pubkeys = [session.a_pubky];
    if (session.b_pubky) pubkeys.push(session.b_pubky);
    fetchUsernames(pubkeys).then(setUsernames);
  }, [session]);

  const isPersonA = session.a_pubky === userPubky;
  const isPersonB = session.b_pubky === userPubky || !session.b_pubky;
  const alreadySigned = isPersonA ? !!session.a_authentication : !!session.b_authentication;

  const handleSign = async () => {
    setIsSigning(true);
    setError(null);

    try {
      await ensureSodiumReady();

      const bPubky = isPersonB && !session.b_pubky ? userPubky : session.b_pubky!;

      const canonicalObj = createCanonicalObject(
        session.id,
        session.a_pubky,
        bPubky,
        session.statement_hash,
        session.window_start,
        session.window_end
      );

      const canonicalHash = await hashCanonicalObject(canonicalObj);
      const hashBytes = sodium.from_hex(canonicalHash);

      console.log('[ReviewAndSign] Signing canonical hash:', canonicalHash);
      console.log('[ReviewAndSign] User pubky:', userPubky);

      const signature = await generateMockSignature(hashBytes);
      const signatureHex = sodium.to_hex(signature);

      console.log('[ReviewAndSign] Generated signature:', signatureHex);

      const updateData: any = {};

      if (isPersonA) {
        updateData.a_authentication = signatureHex;
      } else {
        updateData.b_pubky = userPubky;
        updateData.b_authentication = signatureHex;
      }

      const { data, error: dbError } = await supabase
        .from('consent_sessions')
        .update(updateData)
        .eq('id', session.id)
        .select()
        .single();

      if (dbError) throw dbError;

      console.log('[ReviewAndSign] Signature saved successfully');

      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: refreshedData, error: refreshError } = await supabase
        .from('consent_sessions')
        .select('*')
        .eq('id', session.id)
        .single();

      if (refreshError) throw refreshError;

      console.log('[ReviewAndSign] Session status after refresh:', refreshedData.status);

      if (refreshedData.status === 'pending' && refreshedData.a_authentication && refreshedData.b_authentication) {
        console.log('[ReviewAndSign] Session has both authentications but still pending, calling refresh function...');

        const { data: functionResult, error: functionError } = await supabase
          .rpc('refresh_session_status', { session_id: session.id });

        if (functionError) {
          console.error('[ReviewAndSign] Error calling refresh function:', functionError);
        } else {
          console.log('[ReviewAndSign] Refresh function result:', functionResult);
          if (functionResult && typeof functionResult === 'object') {
            audioService.playSignatureComplete();
            onSigned(functionResult as ConsentSession);
            return;
          }
        }
      }

      audioService.playSignatureComplete();
      onSigned(refreshedData || data);
    } catch (err) {
      console.error('[ReviewAndSign] Error:', err);
      setError('Failed to sign session. Please try again.');
      setIsSigning(false);
    }
  };

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
              <h2 className="text-lg font-bold text-white">Review and Sign</h2>
              <p className="text-white text-opacity-95 text-xs mt-1">
                {alreadySigned ? 'You have already signed' : 'Review before signing'}
              </p>
            </div>

            <div className="p-4 space-y-3">
              {alreadySigned && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-emerald-900">Already Signed</p>
                    <p className="text-[10px] text-emerald-800 mt-0.5 leading-snug">
                      Waiting for the other party.
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-warm-50 border border-warm-200 rounded-xl p-3 max-h-[20vh] overflow-y-auto">
                <div className="flex items-center space-x-1.5 mb-2">
                  <FileCheck className="w-3.5 h-3.5 text-warm-700" />
                  <h3 className="text-xs font-bold text-warm-900">Consent Agreement</h3>
                </div>
                <p className="text-[10px] text-warm-900 leading-snug border-l-2 border-coral-500 pl-2">
                  {session.consent_statement}
                </p>
              </div>

              <div className="bg-warm-50 border border-warm-200 rounded-xl p-3 space-y-3 max-h-[30vh] overflow-y-auto">
                <div>
                  <div className="flex items-center space-x-1.5 mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-warm-700" />
                    <p className="text-xs font-bold text-warm-900">Time Window</p>
                  </div>
                  <div className="ml-5 space-y-1">
                    <p className="text-[10px] text-warm-900">
                      <span className="font-bold">Duration:</span> {session.window_duration_minutes} min
                    </p>
                    <p className="text-[10px] text-warm-900">
                      <span className="font-bold">Starts:</span> {formatDateTime(session.window_start)}
                    </p>
                    <p className="text-[10px] text-warm-900">
                      <span className="font-bold">Ends:</span> {formatDateTime(session.window_end)}
                    </p>
                  </div>
                </div>

                <div className="border-t border-warm-200 pt-2">
                  <div className="flex items-center space-x-1.5 mb-1.5">
                    <User className="w-3.5 h-3.5 text-warm-700" />
                    <p className="text-xs font-bold text-warm-900">Participants</p>
                  </div>
                  <div className="ml-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-warm-600 font-medium">Person A {isPersonA && '(You)'}</p>
                        {usernames[session.a_pubky] && (
                          <span className="text-[10px] text-warm-900 font-semibold">@{usernames[session.a_pubky]}</span>
                        )}
                        <code className="text-[9px] text-warm-900 font-mono font-bold block">
                          {formatPubkyShort(session.a_pubky)}
                        </code>
                      </div>
                      {session.a_authentication && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                          Signed
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-warm-600 font-medium">Person B {isPersonB && '(You)'}</p>
                        {usernames[session.b_pubky || userPubky] && (
                          <span className="text-[10px] text-warm-900 font-semibold">@{usernames[session.b_pubky || userPubky]}</span>
                        )}
                        <code className="text-[9px] text-warm-900 font-mono font-bold block">
                          {session.b_pubky ? formatPubkyShort(session.b_pubky) : formatPubkyShort(userPubky)}
                        </code>
                      </div>
                      {session.b_authentication && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                          Signed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2">
                <p className="text-xs text-amber-900 font-bold mb-1">Important</p>
                <ul className="text-[10px] text-amber-900 space-y-0.5 list-disc list-inside leading-snug">
                  <li>Signature is cryptographically binding</li>
                  <li>Cannot be revoked until expiration</li>
                  <li>Both parties sign same agreement</li>
                </ul>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-2 flex items-start space-x-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-red-800 leading-snug">{error}</p>
                </div>
              )}

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={onCancel}
                  disabled={isSigning}
                  className="flex-1 px-4 py-2 border-2 border-warm-300 text-warm-900 font-bold rounded-xl hover:bg-warm-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                >
                  {alreadySigned ? 'Close' : 'Cancel'}
                </button>
                {!alreadySigned && (
                  <button
                    onClick={handleSign}
                    disabled={isSigning}
                    className="flex-1 px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-bold rounded-xl shadow-soft-md hover:shadow-soft-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5 text-xs"
                  >
                    {isSigning ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Signing...</span>
                      </>
                    ) : (
                      <>
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Sign Agreement</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
