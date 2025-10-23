import { useState, useEffect } from 'react';
import { QRCodeCanvas } from './QRCodeCanvas';
import { Loader2, Copy, Check, ArrowLeft, ExternalLink, Smartphone } from 'lucide-react';
import { convertToRingURL } from '../utils/deepLink';

interface AuthScreenProps {
  onSignIn: () => Promise<{ authURL: string; waitForResponse: () => Promise<void> }>;
  pendingJoinId?: string | null;
  onBack?: () => void;
}

export function AuthScreen({ onSignIn, pendingJoinId, onBack }: AuthScreenProps) {
  const [authURL, setAuthURL] = useState<string>('');
  const [isWaiting, setIsWaiting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string>('');
  const [copiedAuthLink, setCopiedAuthLink] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const mobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      setIsMobile(mobile);
    };
    checkMobile();
  }, []);

  useEffect(() => {
    const handleSignIn = async () => {
      try {
        setError('');
        const { authURL, waitForResponse } = await onSignIn();
        setAuthURL(authURL);
        setIsInitializing(false);
        setIsWaiting(true);

        await waitForResponse();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setIsWaiting(false);
        setIsInitializing(false);
      }
    };

    handleSignIn();
  }, [onSignIn]);

  const handleCopyAuthLink = async () => {
    try {
      await navigator.clipboard.writeText(authURL);
      setCopiedAuthLink(true);
      setTimeout(() => setCopiedAuthLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      const textArea = document.createElement('textarea');
      textArea.value = authURL;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedAuthLink(true);
        setTimeout(() => setCopiedAuthLink(false), 2000);
      } catch (execErr) {
        console.error('Fallback copy failed:', execErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleOpenAuthLink = () => {
    const ringURL = convertToRingURL(authURL);
    window.location.href = ringURL;
  };

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col">
      <div className="flex-1 flex flex-col w-full p-5 md:max-w-2xl md:mx-auto md:p-6 md:justify-center">
        {onBack && !pendingJoinId && (
          <button
            onClick={onBack}
            className="mb-6 flex items-center space-x-2 text-warm-600 hover:text-coral-600 transition-colors px-2 py-2 rounded-lg hover:bg-warm-50 self-start"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold text-base">Back</span>
          </button>
        )}

        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-warm-900 mb-2">ConsentKy</h1>
        </div>

        {pendingJoinId && (
          <div className="mb-8 bg-coral-50 border border-coral-200 rounded-xl p-5">
            <p className="text-base text-warm-900 text-center leading-relaxed">
              <span className="font-bold text-lg">Joining session</span>
              <br />
              Please authenticate
            </p>
          </div>
        )}

        {isInitializing ? (
          <div className="flex-1 flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center space-y-6">
              <Loader2 className="w-12 h-12 animate-spin text-coral-600" />
              <span className="text-lg font-semibold text-coral-600">Preparing authentication...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col justify-center space-y-8">
            <div className="bg-white rounded-xl p-6 space-y-3 border border-warm-200 shadow-sm">
              <h2 className="font-bold text-warm-900 text-lg">What is Pubky Ring?</h2>
              <p className="text-base text-warm-700 leading-relaxed">
                Your secure key manager for signing consent agreements with cryptographic proof.
              </p>
            </div>

            <div className="bg-red-50 text-red-700 rounded-xl p-5 text-base border border-red-200">
              {error}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center space-y-8">
            <div className="bg-white rounded-xl p-6 space-y-3 border border-warm-200 shadow-sm">
              <h2 className="font-bold text-warm-900 text-lg">What is Pubky Ring?</h2>
              <p className="text-base text-warm-700 leading-relaxed">
                Your secure key manager for signing consent agreements with cryptographic proof.
              </p>
            </div>

            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-warm-900 mb-3">
                {isMobile ? 'Open in Pubky Ring' : 'Scan with Pubky Ring'}
              </h2>
              {isMobile && (
                <p className="text-base text-warm-600 mt-2">
                  Tap below to open in the app
                </p>
              )}
            </div>

            {!isMobile && (
              <div className="flex justify-center bg-white p-6 rounded-xl border border-warm-200 shadow-sm">
                <div className="w-full max-w-[240px]">
                  <QRCodeCanvas value={authURL} size={240} />
                </div>
              </div>
            )}

            {isMobile ? (
              <button
                onClick={handleOpenAuthLink}
                className="w-full px-8 py-5 bg-coral-500 hover:bg-coral-600 text-white font-bold rounded-xl transition-all flex items-center justify-center space-x-3 shadow-md hover:shadow-lg text-lg"
              >
                <Smartphone className="w-6 h-6" />
                <span>Open Pubky Ring</span>
                <ExternalLink className="w-5 h-5" />
              </button>
            ) : null}

            <button
              onClick={handleCopyAuthLink}
              className="w-full px-8 py-4 bg-warm-100 hover:bg-warm-200 text-warm-900 font-bold rounded-xl transition-all flex items-center justify-center space-x-3 border border-warm-200 hover:border-warm-300 text-base"
            >
              {copiedAuthLink ? (
                <>
                  <Check className="w-6 h-6 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-6 h-6" />
                  <span>Copy Auth Link</span>
                </>
              )}
            </button>

            {isWaiting && (
              <div className="flex items-center justify-center space-x-3 text-coral-600 py-6">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-base font-semibold">Waiting for authentication...</span>
              </div>
            )}

            {isMobile && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-base text-warm-700">
                <p className="font-semibold mb-3 text-base">Troubleshooting:</p>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li>Ensure Pubky Ring app is installed</li>
                  <li>Try copying link to browser</li>
                  <li>Use a different browser if needed</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
