import { useState, useEffect } from 'react';
import { X, Copy, Check, Shield, CheckCircle, Server, AlertCircle, Clock, User } from 'lucide-react';
import { ConsentSession } from '../types';
import { formatDateTime } from '../lib/consent';
import { fetchUsernames, formatUserDisplay } from '../utils/username';
import { getHomeserverStorageStatus } from '../lib/homeserverStorage';

interface ProofDetailsProps {
  session: ConsentSession;
  onClose: () => void;
}

export function ProofDetails({ session, onClose }: ProofDetailsProps) {
  const [copied, setCopied] = useState(false);
  const [usernames, setUsernames] = useState<Record<string, string | null>>({});

  useEffect(() => {
    loadUsernames();
  }, [session]);

  const loadUsernames = async () => {
    if (!session.b_pubky) return;
    const pubkeys = [session.a_pubky, session.b_pubky];
    const names = await fetchUsernames(pubkeys);
    setUsernames(names);
  };

  const handleCopyJSON = async () => {
    const sessionData = JSON.stringify(session, null, 2);
    await navigator.clipboard.writeText(sessionData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isComplete = session.b_pubky && session.a_authentication && session.b_authentication;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-3xl shadow-soft-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-coral-500 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="w-7 h-7 text-white" />
            <h2 className="text-2xl font-bold text-white">Session Details</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-white hover:bg-opacity-20 rounded-xl transition-all"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-7">
          {!isComplete && (
            <div className="border-2 rounded-2xl p-6 bg-amber-50 border-amber-300">
              <div className="flex items-center space-x-4">
                <Clock className="w-10 h-10 text-amber-600 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-bold text-amber-900">
                    Session Incomplete
                  </h3>
                  <p className="text-base mt-1 text-amber-700">
                    {!session.b_pubky ? 'Waiting for second participant to join' :
                     !session.a_authentication ? 'Waiting for Person A to sign' :
                     'Waiting for Person B to sign'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isComplete && (
            <div className="border-2 rounded-2xl p-6 bg-emerald-50 border-emerald-300">
              <div className="flex items-center space-x-4">
                <CheckCircle className="w-10 h-10 text-emerald-600 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-bold text-emerald-900">
                    Session Complete
                  </h3>
                  <p className="text-base mt-1 text-emerald-700">
                    Both participants have signed the consent agreement
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-warm-50 border border-warm-200 rounded-2xl p-6">
            <h4 className="text-base font-bold text-warm-900 mb-4">Session Information</h4>
            <div className="space-y-3 text-sm">
              <div className="flex flex-col gap-2">
                <span className="text-warm-600 font-medium">Session ID:</span>
                <code className="text-2xl text-warm-900 font-mono font-bold tracking-wider text-center">{session.id}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-warm-600 font-medium">Version:</span>
                <span className="text-warm-900 font-bold">{session.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-warm-600 font-medium">Status:</span>
                <span className={`font-bold ${
                  session.status === 'active' ? 'text-emerald-600' :
                  session.status === 'pending' ? 'text-amber-600' :
                  'text-warm-600'
                }`}>
                  {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-warm-600 font-medium">Duration:</span>
                <span className="text-warm-900 font-bold">{session.window_duration_minutes} minutes</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Time Window</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-600">Start:</span>
                <p className="text-slate-800 font-medium mt-1">{formatDateTime(session.window_start)}</p>
              </div>
              <div>
                <span className="text-slate-600">End:</span>
                <p className="text-slate-800 font-medium mt-1">{formatDateTime(session.window_end)}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Consent Statement</h4>
            <p className="text-sm text-slate-800 leading-relaxed border-l-4 border-blue-600 pl-3">
              {session.consent_statement}
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-900 flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Participants</span>
            </h4>

            <div className={`border-2 rounded-lg p-4 ${session.a_authentication ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-300'}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h5 className="text-sm font-semibold text-slate-900">Person A</h5>
                  <p className="text-xs text-slate-600 mt-1">
                    {formatUserDisplay(session.a_pubky, usernames[session.a_pubky], false)}
                  </p>
                </div>
                {session.a_authentication ? (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Signed</span>
                  </span>
                ) : (
                  <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded font-medium flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Pending</span>
                  </span>
                )}
              </div>
              <div>
                <span className="text-xs text-slate-600">Public Key:</span>
                <code className="text-xs text-slate-700 font-mono block mt-1 break-all">
                  {session.a_pubky}
                </code>
              </div>
            </div>

            <div className={`border-2 rounded-lg p-4 ${session.b_pubky && session.b_authentication ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-300'}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h5 className="text-sm font-semibold text-slate-900">Person B</h5>
                  {session.b_pubky ? (
                    <p className="text-xs text-slate-600 mt-1">
                      {formatUserDisplay(session.b_pubky, usernames[session.b_pubky], false)}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1 italic">Not yet joined</p>
                  )}
                </div>
                {session.b_authentication ? (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Signed</span>
                  </span>
                ) : (
                  <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded font-medium flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Pending</span>
                  </span>
                )}
              </div>
              {session.b_pubky && (
                <div>
                  <span className="text-xs text-slate-600">Public Key:</span>
                  <code className="text-xs text-slate-700 font-mono block mt-1 break-all">
                    {session.b_pubky}
                  </code>
                </div>
              )}
            </div>
          </div>

{(() => {
            const storageStatus = getHomeserverStorageStatus(session);
            return (
              <div className={`border-2 rounded-2xl p-6 ${
                storageStatus.isFullyStored
                  ? 'bg-blue-50 border-blue-300'
                  : storageStatus.isPartiallyStored
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-slate-50 border-slate-300'
              }`}>
                <div className="flex items-center space-x-3 mb-4">
                  <Server className={`w-6 h-6 ${
                    storageStatus.isFullyStored
                      ? 'text-blue-600'
                      : storageStatus.isPartiallyStored
                      ? 'text-amber-600'
                      : 'text-slate-600'
                  }`} />
                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      Homeserver Storage
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Decentralized backup on Pubky homeservers
                    </p>
                  </div>
                </div>

                {storageStatus.isFullyStored ? (
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-slate-800 font-medium">
                          Stored on both homeservers
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          Permanent proof backed up at {formatDateTime(session.homeserver_stored_at!)}
                        </p>
                      </div>
                    </div>
                    <div className={`bg-white border rounded-lg p-3 ${
                      session.a_homeserver_url ? 'border-blue-200' : 'border-red-300 bg-red-50'
                    }`}>
                      <p className="text-xs text-slate-600 mb-1 font-medium">Person A's Homeserver:</p>
                      {session.a_homeserver_url ? (
                        <code className="text-[10px] text-slate-700 font-mono break-all block">
                          {session.a_homeserver_url}
                        </code>
                      ) : (
                        <div className="text-[10px] text-red-700 font-mono">
                          <span className="font-bold">Value: </span>
                          {session.a_homeserver_url === null ? 'null' :
                           session.a_homeserver_url === undefined ? 'undefined' :
                           session.a_homeserver_url === '' ? '(empty string)' :
                           String(session.a_homeserver_url)}
                        </div>
                      )}
                    </div>
                    <div className={`bg-white border rounded-lg p-3 ${
                      session.b_homeserver_url ? 'border-blue-200' : 'border-red-300 bg-red-50'
                    }`}>
                      <p className="text-xs text-slate-600 mb-1 font-medium">Person B's Homeserver:</p>
                      {session.b_homeserver_url ? (
                        <code className="text-[10px] text-slate-700 font-mono break-all block">
                          {session.b_homeserver_url}
                        </code>
                      ) : (
                        <div className="text-[10px] text-red-700 font-mono">
                          <span className="font-bold">Value: </span>
                          {session.b_homeserver_url === null ? 'null' :
                           session.b_homeserver_url === undefined ? 'undefined' :
                           session.b_homeserver_url === '' ? '(empty string)' :
                           String(session.b_homeserver_url)}
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <span className="text-xs text-slate-600">Statement Hash:</span>
                      <code className="text-xs text-slate-700 font-mono block mt-1 break-all">
                        {session.statement_hash}
                      </code>
                    </div>
                  </div>
                ) : storageStatus.isPartiallyStored ? (
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-800 font-medium">
                        Partially stored ({storageStatus.storedCount}/2)
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        Missing: {storageStatus.missingHomeservers.join(', ')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-800 font-medium">
                        Not yet stored on homeservers
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        Storage will happen automatically when session becomes active
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <button
            onClick={handleCopyJSON}
            className="w-full px-5 py-4 bg-coral-500 hover:bg-coral-600 text-white font-bold rounded-2xl transition-all shadow-soft-md hover:shadow-soft-lg flex items-center justify-center space-x-2"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                <span>Copy Session Data</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
