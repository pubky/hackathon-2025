import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PlusCircle, ScanLine, LogOut, Copy, Check, History, User } from 'lucide-react';
import { formatPubkyShort } from '../lib/consent';
import { fetchUsername } from '../utils/username';

interface HomeScreenProps {
  onCreateSession: () => void;
  onJoinSession: () => void;
  onViewHistory: () => void;
}

export function HomeScreen({ onCreateSession, onJoinSession, onViewHistory }: HomeScreenProps) {
  const { session, signOut } = useAuth();
  const [copied, setCopied] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (session?.pubky) {
      fetchUsername(session.pubky).then(setUsername);
    }
  }, [session?.pubky]);

  if (!session) {
    return null;
  }

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut();
    }
  };

  const handleCopyPubky = async () => {
    await navigator.clipboard.writeText(session.pubky);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-screen flex flex-col bg-warm-50">
      <nav className="bg-white border-b border-warm-200 sticky top-0 z-10 shadow-soft">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-warm-900">ConsentKy</h1>
              <p className="text-[10px] text-warm-600 mt-0.5">Cryptographic proof of mutual consent</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-1.5 text-warm-600 hover:text-coral-600 transition-colors px-3 py-2 rounded-lg hover:bg-coral-50"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs font-semibold">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="bg-white rounded-xl shadow-soft border border-warm-200 p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                {username ? (
                  <div className="mb-2">
                    <div className="flex items-center space-x-1.5">
                      <User className="w-4 h-4 text-coral-600" />
                      <p className="text-base font-bold text-warm-900">@{username}</p>
                    </div>
                  </div>
                ) : null}
                <p className="text-xs font-bold text-warm-700 mb-1.5">Your Public Key</p>
                <div className="flex items-center gap-2">
                  <code className="text-[10px] text-warm-700 bg-warm-50 px-2 py-1.5 rounded-lg font-mono border border-warm-200 truncate">
                    {formatPubkyShort(session.pubky)}
                  </code>
                  <button
                    onClick={handleCopyPubky}
                    className="flex-shrink-0 p-1.5 text-warm-500 hover:text-coral-600 hover:bg-coral-50 rounded-lg transition-colors"
                    title="Copy full public key"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <button
              onClick={onCreateSession}
              className="w-full bg-coral-500 hover:bg-coral-600 text-white rounded-xl shadow-soft-md hover:shadow-soft-lg transition-all p-4 flex items-center justify-center space-x-2"
            >
              <PlusCircle className="w-5 h-5" />
              <span className="text-sm font-bold">Create Session</span>
            </button>

            <button
              onClick={onJoinSession}
              className="w-full bg-white hover:bg-warm-50 text-warm-900 border-2 border-warm-300 hover:border-coral-300 rounded-xl shadow-soft hover:shadow-soft-md transition-all p-4 flex items-center justify-center space-x-2"
            >
              <ScanLine className="w-5 h-5" />
              <span className="text-sm font-bold">Join Session</span>
            </button>

            <button
              onClick={onViewHistory}
              className="w-full bg-white hover:bg-warm-50 text-warm-700 border-2 border-warm-200 hover:border-warm-300 rounded-xl transition-all p-3 flex items-center justify-center space-x-1.5"
            >
              <History className="w-4 h-4" />
              <span className="text-xs font-semibold">View My Sessions</span>
            </button>
          </div>

          <div className="bg-warm-100 border border-warm-200 rounded-xl p-3">
            <h3 className="text-xs font-bold text-warm-900 mb-2">How it works</h3>
            <ol className="text-[10px] text-warm-700 space-y-1 list-decimal list-inside leading-snug">
              <li>Review consent agreement and time window</li>
              <li>Both parties sign with cryptographic keys</li>
              <li>Consent is active until timer expires</li>
              <li>No revocation during active window</li>
            </ol>
          </div>
        </div>
      </div>

      <footer className="max-w-2xl mx-auto px-4 py-3 text-center text-[10px] text-warm-600 border-t border-warm-200 bg-white">
        <p>
          Powered by{' '}
          <a
            href="https://pubky.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-coral-600 hover:underline font-semibold"
          >
            Pubky
          </a>
          {' '}• Privacy-preserving consent verification
        </p>
      </footer>
    </div>
  );
}
