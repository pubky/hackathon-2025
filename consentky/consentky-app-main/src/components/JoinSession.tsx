import { useState, useEffect, useRef } from 'react';
import { AlertCircle, ArrowRight, Hash, Camera, X, User, Clipboard } from 'lucide-react';
import { LogoutButton } from './LogoutButton';
import jsQR from 'jsqr';
import { supabase } from '../lib/supabase';
import { ConsentSession } from '../types';
import { fetchUsername } from '../utils/username';

interface JoinSessionProps {
  userPubky: string;
  onSessionLoaded: (session: ConsentSession) => void;
  onCancel: () => void;
  initialSessionId?: string;
}

export function JoinSession({ userPubky, onSessionLoaded, onCancel, initialSessionId }: JoinSessionProps) {
  const [sessionId, setSessionId] = useState(initialSessionId || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    fetchUsername(userPubky).then(setUsername);
  }, [userPubky]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const joinParam = urlParams.get('join');
    const sessionIdToUse = joinParam || initialSessionId;

    if (sessionIdToUse) {
      setSessionId(sessionIdToUse);
      handleJoin(sessionIdToUse);
    }
  }, [initialSessionId]);

  const extractSessionId = (input: string): string | null => {
    const trimmed = input.trim();

    // Check if it's a full URL with parameters
    try {
      const url = new URL(trimmed);

      // Check for pendingJoin parameter first
      const pendingJoinParam = url.searchParams.get('pendingJoin');
      if (pendingJoinParam) {
        console.log('[JoinSession] Detected pendingJoin in URL, redirecting for auth:', pendingJoinParam);
        // Reload the page with the pendingJoin parameter to trigger auth flow
        window.location.href = trimmed;
        return null; // Return null to prevent further processing
      }

      // Check for direct join parameter
      const joinParam = url.searchParams.get('join');
      if (joinParam) {
        return joinParam;
      }
    } catch {
      // Not a valid URL, treat as session ID
    }

    // Return as-is (assume it's a session ID)
    return trimmed;
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startScanning = async () => {
    setError(null);
    setIsScanning(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait for video metadata to load
        await new Promise<void>((resolve) => {
          if (!videoRef.current) return;
          videoRef.current.onloadedmetadata = () => {
            resolve();
          };
        });

        // Play the video
        await videoRef.current.play();

        // Start scanning for QR codes after video is ready
        scanIntervalRef.current = window.setInterval(() => {
          scanQRCode();
        }, 300);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Unable to access camera. Please check your permissions.');
      setIsScanning(false);
      stopCamera();
    }
  };

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Check if video is ready and has dimensions
    if (video.readyState !== video.HAVE_ENOUGH_DATA || !video.videoWidth || !video.videoHeight) {
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data and scan for QR code
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = detectQRCode(imageData);

    if (code) {
      stopCamera();
      setSessionId(code);
      handleJoin(code);
    }
  };

  const detectQRCode = (imageData: ImageData): string | null => {
    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        const text = code.data;
        console.log('[JoinSession] QR code detected:', text);

        // Check if it's a URL with ?pendingJoin= parameter (priority for new flow)
        const pendingJoinMatch = text.match(/\?pendingJoin=([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
        if (pendingJoinMatch) {
          console.log('[JoinSession] Detected pendingJoin parameter:', pendingJoinMatch[1]);
          // For pendingJoin, we need to return the full URL so the app can handle auth
          return text;
        }

        // Check if it's a full URL with ?join= parameter (direct session ID)
        const urlMatch = text.match(/\?join=([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
        if (urlMatch) {
          console.log('[JoinSession] Detected join parameter:', urlMatch[1]);
          return urlMatch[1];
        }

        // Check if it matches session ID format directly
        const sessionIdMatch = text.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
        if (sessionIdMatch) {
          console.log('[JoinSession] Detected direct session ID:', text);
          return text;
        }

        // Otherwise, try to extract session ID from anywhere in the text
        const anyMatch = text.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
        if (anyMatch) {
          console.log('[JoinSession] Detected session ID in text:', anyMatch[0]);
          return anyMatch[0];
        }

        console.warn('[JoinSession] No recognizable pattern in QR code:', text);
      }
    } catch (err) {
      console.error('[JoinSession] QR detection error:', err);
    }
    return null;
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setSessionId(text);
      setError(null);
    } catch (err) {
      console.error('[JoinSession] Clipboard access error:', err);
      setError('Unable to access clipboard. Please paste manually.');
    }
  };

  const handleJoin = async (sid?: string) => {
    const targetSessionId = extractSessionId(sid || sessionId);

    // If extractSessionId returns null, it means we're redirecting for auth
    if (targetSessionId === null) {
      console.log('[JoinSession] Redirecting for authentication...');
      return;
    }

    if (!targetSessionId || targetSessionId.trim() === '') {
      setError('Please enter a session ID or URL');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('consent_sessions')
        .select('*')
        .eq('id', targetSessionId)
        .maybeSingle();

      if (dbError) throw dbError;

      if (!data) {
        setError('Session not found. Please check the session ID and try again.');
        setIsLoading(false);
        return;
      }

      if (data.a_pubky === userPubky) {
        setError('You cannot join your own session. You are the creator of this session.');
        setIsLoading(false);
        return;
      }

      if (data.b_pubky && data.b_pubky !== userPubky) {
        setError('This session already has a partner. You cannot join.');
        setIsLoading(false);
        return;
      }

      const now = new Date();
      const windowEnd = new Date(data.window_end);

      if (now > windowEnd) {
        setError('This session has expired and cannot be joined.');
        setIsLoading(false);
        return;
      }

      onSessionLoaded(data);
    } catch (err) {
      console.error('[JoinSession] Error:', err);
      setError('Failed to load session. Please try again.');
      setIsLoading(false);
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
          <LogoutButton />
        </div>
      </nav>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="bg-white rounded-xl shadow-soft-lg border border-warm-200 overflow-hidden">
            <div className="bg-coral-500 px-4 py-3">
              <h2 className="text-lg font-bold text-white">Join Consent Session</h2>
              <p className="text-white text-opacity-95 text-xs mt-1">Scan QR code or paste session details</p>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-warm-900 mb-2">
                  Session ID or Link
                </label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                      <Hash className="w-3.5 h-3.5 text-warm-500" />
                    </div>
                    <input
                      type="text"
                      value={sessionId}
                      onChange={(e) => {
                        setSessionId(e.target.value);
                        setError(null);
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !isLoading) {
                          handleJoin();
                        }
                      }}
                      placeholder="Paste session ID or link"
                      className="w-full pl-8 pr-2 py-2 border-2 border-warm-200 rounded-xl text-xs text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all font-medium"
                    />
                  </div>
                  <button
                    onClick={handlePaste}
                    disabled={isLoading}
                    className="px-3 py-2 bg-warm-200 hover:bg-warm-300 text-warm-900 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    title="Paste from Clipboard"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={startScanning}
                    disabled={isLoading || isScanning}
                    className="px-3 py-2 bg-warm-200 hover:bg-warm-300 text-warm-900 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    title="Scan QR Code"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-warm-600 mt-1.5">
                  Paste session ID, link, or scan QR code
                </p>
              </div>

              {isScanning && (
                <div className="bg-warm-900 rounded-xl p-3 relative">
                  <button
                    onClick={stopCamera}
                    className="absolute top-2 right-2 z-10 p-1.5 bg-white rounded-full hover:bg-warm-100 transition-all"
                  >
                    <X className="w-3.5 h-3.5 text-warm-900" />
                  </button>
                  <div className="relative bg-black rounded-lg overflow-hidden" style={{ height: '30vh' }}>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover rounded-lg"
                      playsInline
                      muted
                      autoPlay
                      style={{ height: '30vh' }}
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-40 h-40 border-2 border-white rounded-xl relative">
                        <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-2 border-l-2 border-coral-500 rounded-tl-lg" />
                        <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-2 border-r-2 border-coral-500 rounded-tr-lg" />
                        <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-2 border-l-2 border-coral-500 rounded-bl-lg" />
                        <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-2 border-r-2 border-coral-500 rounded-br-lg" />
                      </div>
                    </div>
                  </div>
                  <p className="text-white text-center mt-2 font-medium text-[10px]">
                    Position QR code within frame
                  </p>
                </div>
              )}

              <div className="bg-warm-50 border border-warm-200 rounded-xl p-2">
                <p className="text-[10px] text-warm-800 leading-snug">
                  <span className="font-bold">Note:</span> You'll review the full consent agreement before signing.
                </p>
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
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border-2 border-warm-300 text-warm-900 font-bold rounded-xl hover:bg-warm-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleJoin()}
                  disabled={isLoading || !sessionId.trim()}
                  className="flex-1 px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-bold rounded-xl shadow-soft-md hover:shadow-soft-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5 text-xs"
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <span>Join Session</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

              <div className="bg-warm-100 border border-warm-200 rounded-xl p-2 max-h-[15vh] overflow-y-auto">
                <h3 className="text-xs font-bold text-warm-900 mb-1.5">How to join</h3>
                <ol className="text-[10px] text-warm-800 space-y-1 list-decimal list-inside leading-snug">
                  <li>Get session ID, link, or QR from partner</li>
                  <li>Scan QR with camera to open and authenticate</li>
                  <li>Or paste session ID/link above if authenticated</li>
                  <li>Review agreement and sign with key</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
