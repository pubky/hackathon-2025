import { useState, useEffect } from 'react';
import { Clock, ArrowRight, AlertCircle, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { ConsentSession } from '../types';
import {
  CONSENT_STATEMENT_V1,
  CONSENT_VERSION,
  generateStatementHash,
  calculateWindowTimes,
  generateShortId,
  createCanonicalObject,
  hashCanonicalObject
} from '../lib/consent';
import { LogoutButton } from './LogoutButton';
import { fetchUsername } from '../utils/username';
import { audioService } from '../utils/audioService';
import { AudioToggle } from './AudioToggle';
import { ensureSodiumReady, generateMockSignature } from '../lib/crypto';
import sodium from 'libsodium-wrappers';

interface CreateSessionProps {
  userPubky: string;
  onSessionCreated: (session: ConsentSession) => void;
  onCancel: () => void;
}

const PRESET_DURATIONS = [
  { label: '2 hours', value: 120 },
  { label: '6 hours', value: 360 },
  { label: '12 hours', value: 720 }
];

export function CreateSession({ userPubky, onSessionCreated, onCancel }: CreateSessionProps) {
  const [selectedDuration, setSelectedDuration] = useState<number>(120);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    fetchUsername(userPubky).then(setUsername);
  }, [userPubky]);

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);

    try {
      console.log('[CreateSession] Starting session creation...');
      console.log('[CreateSession] User pubky:', userPubky);

      await ensureSodiumReady();

      const statementHash = await generateStatementHash(CONSENT_STATEMENT_V1);
      console.log('[CreateSession] Statement hash generated:', statementHash);

      const { start, end } = calculateWindowTimes(selectedDuration);
      console.log('[CreateSession] Window times:', { start, end });

      const sessionId = generateShortId();
      console.log('[CreateSession] Generated session ID:', sessionId);

      const canonicalObj = createCanonicalObject(
        sessionId,
        userPubky,
        userPubky,
        statementHash,
        start,
        end
      );

      const canonicalHash = await hashCanonicalObject(canonicalObj);
      const hashBytes = sodium.from_hex(canonicalHash);

      console.log('[CreateSession] Generating creator signature...');
      const signature = await generateMockSignature(hashBytes);
      const signatureHex = sodium.to_hex(signature);
      console.log('[CreateSession] Creator signature generated:', signatureHex);

      const insertData = {
        id: sessionId,
        version: CONSENT_VERSION,
        a_pubky: userPubky,
        statement_hash: statementHash,
        consent_statement: CONSENT_STATEMENT_V1,
        window_start: start,
        window_end: end,
        window_duration_minutes: selectedDuration,
        a_authentication: signatureHex,
        status: 'pending'
      };
      console.log('[CreateSession] Insert data:', insertData);

      const { data, error: dbError } = await supabase
        .from('consent_sessions')
        .insert(insertData)
        .select()
        .single();

      console.log('[CreateSession] Response:', { data, dbError });

      if (dbError) {
        console.error('[CreateSession] Database error:', dbError);
        throw dbError;
      }

      if (!data) {
        throw new Error('No data returned from insert');
      }

      console.log('[CreateSession] Session created and signed successfully:', data.id);
      audioService.playSessionCreated();

      // Start waiting music immediately after session creation
      console.log('[CreateSession] Starting waiting music...');
      await audioService.startWaitingMusic();

      onSessionCreated(data);
    } catch (err) {
      console.error('[CreateSession] Error:', err);
      const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
      setError(`Failed to create session: ${errorMessage}`);
      setIsCreating(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-warm-50">
      <nav className="bg-white border-b border-warm-200 sticky top-0 z-10 shadow-soft">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-sm font-bold text-warm-900">ConsentKy</h1>
            {username && (
              <div className="flex items-center space-x-1 mt-0.5">
                <User className="w-3 h-3 text-warm-600" />
                <p className="text-[10px] text-warm-600 font-medium">@{username}</p>
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
              <h2 className="text-lg font-bold text-white">Create Consent Session</h2>
              <p className="text-white text-opacity-90 text-xs mt-1">Choose a time window for mutual consent</p>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-warm-900 mb-2">
                  Select Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_DURATIONS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => {
                        setSelectedDuration(preset.value);
                        setError(null);
                      }}
                      className={`px-3 py-2.5 rounded-xl border-2 font-bold text-xs transition-all ${
                        selectedDuration === preset.value
                          ? 'border-coral-500 bg-coral-50 text-coral-700 shadow-soft'
                          : 'border-warm-200 bg-white text-warm-700 hover:border-warm-300 hover:shadow-soft'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-warm-50 border border-warm-200 rounded-xl p-3 max-h-[25vh] overflow-y-auto">
                <div className="flex items-center space-x-1.5 mb-2">
                  <Clock className="w-3.5 h-3.5 text-warm-700" />
                  <h3 className="text-xs font-bold text-warm-900">Consent Agreement</h3>
                </div>
                <p className="text-[10px] text-warm-800 leading-snug border-l-2 border-coral-500 pl-2">
                  {CONSENT_STATEMENT_V1}
                </p>
              </div>

              <div className="bg-coral-50 border border-coral-200 rounded-xl p-2.5">
                <p className="text-[10px] text-warm-900 leading-snug">
                  <span className="font-bold">You and your partner</span> will sign for{' '}
                  <span className="font-bold text-coral-600">
                    {selectedDuration >= 60
                      ? `${selectedDuration / 60} ${selectedDuration / 60 === 1 ? 'hour' : 'hours'}`
                      : `${selectedDuration} minutes`}
                  </span>.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 flex items-start space-x-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-red-800 leading-snug">{error}</p>
                </div>
              )}

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={onCancel}
                  disabled={isCreating}
                  className="flex-1 px-4 py-2.5 border-2 border-warm-300 text-warm-900 font-bold rounded-xl hover:bg-warm-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="flex-1 px-4 py-2.5 bg-coral-500 hover:bg-coral-600 text-white font-bold rounded-xl shadow-soft-md hover:shadow-soft-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5 text-xs"
                >
                  {isCreating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating & Signing...</span>
                    </>
                  ) : (
                    <>
                      <span>Create & Sign Session</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
