import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { pubkyClient } from '../lib/pubky';
import { AuthState, PubkySession } from '../types';
import { updateSupabaseHeaders, supabase } from '../lib/supabase';
import { UsernamePrompt } from '../components/UsernamePrompt';
import { audioService } from '../utils/audioService';

interface AuthContextType extends AuthState {
  signIn: (pendingJoinId?: string) => Promise<{ authURL: string; waitForResponse: () => Promise<void> }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'pubky_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    session: null,
    user: null,
    isLoading: true
  });
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [currentPubky, setCurrentPubky] = useState<string | null>(null);

  useEffect(() => {
    const restoreSessionAsync = async () => {
      try {
        const savedSession = localStorage.getItem(SESSION_KEY);

        if (savedSession) {
          try {
            const session: PubkySession = JSON.parse(savedSession);

            console.log('[AuthContext] Attempting to restore session');
            await pubkyClient.restoreSession(session);

            console.log('[AuthContext] Session restored successfully');
            updateSupabaseHeaders(session.pubky);
            setAuthState({
              isAuthenticated: true,
              session,
              user: null,
              isLoading: false
            });
          } catch (error) {
            console.error('[AuthContext] Failed to restore session:', error);
            console.log('[AuthContext] Clearing stored session data');
            try {
              localStorage.removeItem(SESSION_KEY);
            } catch (storageError) {
              console.warn('[AuthContext] localStorage not accessible:', storageError);
            }
            setAuthState({
              isAuthenticated: false,
              session: null,
              user: null,
              isLoading: false
            });
          }
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (storageError) {
        console.warn('[AuthContext] localStorage access failed on init:', storageError);
        setAuthState({
          isAuthenticated: false,
          session: null,
          user: null,
          isLoading: false
        });
      }
    };

    restoreSessionAsync();
  }, []);

  const signIn = async (pendingJoinId?: string) => {
    const { authURL, waitForResponse } = await pubkyClient.initiateAuth(pendingJoinId);

    return {
      authURL,
      waitForResponse: async () => {
        const session = await waitForResponse();

        try {
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        } catch (storageError) {
          console.warn('[AuthContext] localStorage not accessible for saving session:', storageError);
        }

        updateSupabaseHeaders(session.pubky);

        setAuthState({
          isAuthenticated: true,
          session,
          user: null,
          isLoading: false
        });

        audioService.playAuthSuccess();

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('username')
          .eq('pubky', session.pubky)
          .maybeSingle();

        if (!profile) {
          setCurrentPubky(session.pubky);
          setShowUsernamePrompt(true);
        }
      }
    };
  };

  const handleUsernameComplete = async () => {
    setShowUsernamePrompt(false);
    setCurrentPubky(null);
  };

  const signOut = async () => {
    if (authState.session) {
      await pubkyClient.signOut(authState.session.pubky);
    }

    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (storageError) {
      console.warn('[AuthContext] localStorage not accessible for signout:', storageError);
    }

    updateSupabaseHeaders(null);

    setAuthState({
      isAuthenticated: false,
      session: null,
      user: null,
      isLoading: false
    });
  };

  return (
    <AuthContext.Provider value={{ ...authState, signIn, signOut }}>
      {children}
      {showUsernamePrompt && currentPubky && (
        <UsernamePrompt
          pubky={currentPubky}
          onComplete={handleUsernameComplete}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
