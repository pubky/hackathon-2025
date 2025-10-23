import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ConsentSession } from '../types';
import { supabase } from '../lib/supabase';

interface SessionContextType {
  currentSession: ConsentSession | null;
  setCurrentSession: (session: ConsentSession | null) => void;
  clearSession: () => void;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = 'consentky_current_session';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [currentSession, setCurrentSessionState] = useState<ConsentSession | null>(() => {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setCurrentSession = (session: ConsentSession | null) => {
    setCurrentSessionState(session);
    if (session) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  };

  const clearSession = () => {
    setCurrentSessionState(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  const refreshSession = async () => {
    if (!currentSession) return;

    try {
      const { data, error } = await supabase
        .from('consent_sessions')
        .select('*')
        .eq('id', currentSession.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCurrentSession(data);
      } else {
        clearSession();
      }
    } catch (error) {
      console.error('[SessionContext] Error refreshing session:', error);
    }
  };

  useEffect(() => {
    if (!currentSession) return;

    const channel = supabase
      .channel(`session:${currentSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'consent_sessions',
          filter: `id=eq.${currentSession.id}`
        },
        (payload) => {
          console.log('[SessionContext] Session updated via real-time:', {
            oldStatus: payload.old?.status,
            newStatus: payload.new?.status,
            hasNewData: !!payload.new
          });
          if (payload.new) {
            const updatedSession = payload.new as ConsentSession;
            console.log('[SessionContext] Updating current session with real-time data:', {
              sessionId: updatedSession.id,
              status: updatedSession.status,
              hasAAuthentication: !!updatedSession.a_authentication,
              hasBAuthentication: !!updatedSession.b_authentication
            });
            setCurrentSession(updatedSession);
          }
        }
      )
      .subscribe((status) => {
        console.log('[SessionContext] Real-time subscription status:', status);
      });

    const intervalId = setInterval(() => {
      refreshSession();
    }, 10000);

    return () => {
      channel.unsubscribe();
      clearInterval(intervalId);
    };
  }, [currentSession?.id]);

  return (
    <SessionContext.Provider value={{ currentSession, setCurrentSession, clearSession, refreshSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
