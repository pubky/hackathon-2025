import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { LandingPage } from './components/LandingPage';
import { AuthScreen } from './components/AuthScreen';
import { HomeScreen } from './components/HomeScreen';
import { CreateSession } from './components/CreateSession';
import { ShareSession } from './components/ShareSession';
import { JoinSession } from './components/JoinSession';
import { ReviewAndSign } from './components/ReviewAndSign';
import { ActiveSession } from './components/ActiveSession';
import { MySessionsScreen } from './components/MySessionsScreen';
import { SessionProvider } from './contexts/SessionContext';
import { ConsentSession } from './types';
import { Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase';
import { audioService } from './utils/audioService';

type Screen =
  | 'home'
  | 'create'
  | 'share'
  | 'join'
  | 'review'
  | 'active'
  | 'history';

function AppContent() {
  const { isAuthenticated, isLoading, session, signIn } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [currentSession, setCurrentSession] = useState<ConsentSession | null>(null);
  const [pendingJoinSessionId, setPendingJoinSessionId] = useState<string | null>(null);
  const [pendingJoinId, setPendingJoinId] = useState<string | null>(null);
  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const joinParam = urlParams.get('join');
    const pendingJoinParam = urlParams.get('pendingJoin');

    if (joinParam) {
      setPendingJoinSessionId(joinParam);
      setShowLanding(false);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (pendingJoinParam) {
      setPendingJoinId(pendingJoinParam);
      setShowLanding(false);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      setShowLanding(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && pendingJoinId) {
      const processPendingJoin = async () => {
        await handlePendingJoinAuth(pendingJoinId);
        setPendingJoinId(null);
      };
      processPendingJoin();
    }
  }, [isAuthenticated, pendingJoinId]);

  useEffect(() => {
    if (isAuthenticated && pendingJoinSessionId) {
      setCurrentScreen('join');
      setPendingJoinSessionId(null);
    }
  }, [isAuthenticated, pendingJoinSessionId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !session) {
    if (showLanding && !pendingJoinId && !pendingJoinSessionId) {
      return <LandingPage onGetStarted={() => setShowLanding(false)} />;
    }
    return (
      <AuthScreen
        onSignIn={signIn}
        pendingJoinId={pendingJoinId}
        onBack={() => setShowLanding(true)}
      />
    );
  }

  const handleSessionCreated = (session: ConsentSession) => {
    setCurrentSession(session);
    setCurrentScreen('share');
  };

  const handleSessionLoaded = (loadedSession: ConsentSession) => {
    console.log('[App] handleSessionLoaded called with session:', {
      sessionId: loadedSession.id,
      hasConsentStatement: !!loadedSession.consent_statement,
      consentStatementLength: loadedSession.consent_statement?.length,
      windowDuration: loadedSession.window_duration_minutes
    });
    setCurrentSession(loadedSession);
    setCurrentScreen('review');
    console.log('[App] State updated: currentSession set, screen changed to "review"');
  };

  const handleSigned = (signedSession: ConsentSession) => {
    setCurrentSession(signedSession);
    if (signedSession.a_authentication && signedSession.b_authentication) {
      setCurrentScreen('active');
    } else {
      setCurrentScreen('share');
    }
  };

  const handleBothSigned = (signedSession: ConsentSession) => {
    setCurrentSession(signedSession);
    setCurrentScreen('active');
  };

  const handleExpired = () => {
    setCurrentScreen('home');
    setCurrentSession(null);
  };

  const handleClose = () => {
    setCurrentScreen('home');
    setCurrentSession(null);
  };

  const handlePendingJoinAuth = async (pendingJoinId: string) => {
    try {
      console.log('[App] Handling pending join after auth:', { pendingJoinId, isAuthenticated, userPubky: session?.pubky });

      const { data: pendingJoin, error: joinError } = await supabase
        .from('pending_session_joins')
        .select('session_id, created_at, expires_at')
        .eq('id', pendingJoinId)
        .maybeSingle();

      if (joinError) {
        console.error('[App] Error fetching pending join:', joinError);
        throw joinError;
      }

      if (!pendingJoin) {
        console.warn('[App] Pending join not found or expired:', { pendingJoinId, timestamp: new Date().toISOString() });
        alert('This session link has expired or is invalid. Please ask for a new QR code.');
        setCurrentScreen('home');
        return;
      }

      console.log('[App] Pending join found:', {
        sessionId: pendingJoin.session_id,
        createdAt: pendingJoin.created_at,
        expiresAt: pendingJoin.expires_at,
        isExpired: new Date(pendingJoin.expires_at) < new Date()
      });

      const { data: sessionData, error: sessionError } = await supabase
        .from('consent_sessions')
        .select('*')
        .eq('id', pendingJoin.session_id)
        .maybeSingle();

      if (sessionError) {
        console.error('[App] Error fetching session:', sessionError);
        throw sessionError;
      }

      if (!sessionData) {
        console.warn('[App] Session not found:', pendingJoin.session_id);
        alert('This consent session no longer exists.');
        setCurrentScreen('home');
        return;
      }

      console.log('[App] Session data fetched successfully:', {
        sessionId: sessionData.id,
        status: sessionData.status,
        hasPartnerB: !!sessionData.b_pubky,
        windowEnd: sessionData.window_end,
        consentStatement: sessionData.consent_statement ? `${sessionData.consent_statement.substring(0, 50)}...` : 'MISSING',
        windowDuration: sessionData.window_duration_minutes
      });

      // Validate required session fields
      if (!sessionData.consent_statement || !sessionData.window_duration_minutes) {
        console.error('[App] Session data is incomplete:', {
          hasConsentStatement: !!sessionData.consent_statement,
          hasWindowDuration: !!sessionData.window_duration_minutes,
          sessionData
        });
        alert('Session data is incomplete. Please try again or ask for a new QR code.');
        setCurrentScreen('home');
        return;
      }

      // Check if session is still valid
      const now = new Date();
      const windowEnd = new Date(sessionData.window_end);

      if (now > windowEnd) {
        console.warn('[App] Session has expired:', { sessionId: sessionData.id, windowEnd: sessionData.window_end });
        alert('This consent session has expired and cannot be joined.');
        setCurrentScreen('home');
        return;
      }

      // Check if user is trying to join their own session
      if (sessionData.a_pubky === session?.pubky) {
        console.warn('[App] User trying to join own session:', { sessionId: sessionData.id, userPubky: session?.pubky });
        alert('You cannot join your own session. You are the creator.');
        setCurrentScreen('home');
        return;
      }

      // Check if session already has a different partner
      if (sessionData.b_pubky && sessionData.b_pubky !== session?.pubky) {
        console.warn('[App] Session already has different partner:', { sessionId: sessionData.id, existingPartner: sessionData.b_pubky });
        alert('This session already has a partner and cannot be joined.');
        setCurrentScreen('home');
        return;
      }

      console.log('[App] All validations passed, loading session for review:', {
        sessionId: sessionData.id,
        currentUserPubky: session?.pubky
      });

      // Play partner join success sound
      audioService.playPartnerJoinSuccess();

      // Ensure we have the session loaded before navigating
      handleSessionLoaded(sessionData);

      console.log('[App] Session loaded successfully, screen should now be "review"');
    } catch (error) {
      console.error('[App] Error handling pending join:', error);
      alert('Failed to load session. Please try again or ask for a new QR code.');
      setCurrentScreen('home');
    }
  };

  const handleViewSession = (viewSession: ConsentSession) => {
    setCurrentSession(viewSession);
    if (viewSession.status === 'active') {
      setCurrentScreen('active');
    } else {
      setCurrentScreen('review');
    }
  };

  const handleSignAgreement = (sessionToSign: ConsentSession) => {
    setCurrentSession(sessionToSign);
    setCurrentScreen('review');
  };

  switch (currentScreen) {
    case 'create':
      return (
        <CreateSession
          userPubky={session.pubky}
          onSessionCreated={handleSessionCreated}
          onCancel={() => setCurrentScreen('home')}
        />
      );

    case 'share':
      if (!currentSession) {
        setCurrentScreen('home');
        return null;
      }
      return (
        <ShareSession
          sessionId={currentSession.id}
          userPubky={session.pubky}
          onBothSigned={handleBothSigned}
          onSignAgreement={handleSignAgreement}
          onCancel={handleClose}
        />
      );

    case 'join':
      return (
        <JoinSession
          userPubky={session.pubky}
          onSessionLoaded={handleSessionLoaded}
          onCancel={() => setCurrentScreen('home')}
          initialSessionId={pendingJoinSessionId || undefined}
        />
      );

    case 'review':
      if (!currentSession) {
        console.error('[App] Review screen rendered but currentSession is null!');
        setCurrentScreen('home');
        return null;
      }
      console.log('[App] Rendering ReviewAndSign with session:', {
        sessionId: currentSession.id,
        hasConsentStatement: !!currentSession.consent_statement,
        userPubky: session.pubky
      });
      return (
        <ReviewAndSign
          session={currentSession}
          userPubky={session.pubky}
          onSigned={handleSigned}
          onCancel={() => setCurrentScreen('home')}
        />
      );

    case 'active':
      if (!currentSession) {
        setCurrentScreen('home');
        return null;
      }
      return (
        <ActiveSession
          session={currentSession}
          onExpired={handleExpired}
          onClose={handleClose}
          onGoToMySessions={() => setCurrentScreen('history')}
        />
      );

    case 'history':
      return (
        <MySessionsScreen
          userPubky={session.pubky}
          onBack={() => setCurrentScreen('home')}
          onViewSession={handleViewSession}
        />
      );

    case 'home':
    default:
      return (
        <HomeScreen
          onCreateSession={() => setCurrentScreen('create')}
          onJoinSession={() => setCurrentScreen('join')}
          onViewHistory={() => setCurrentScreen('history')}
        />
      );
  }
}

function App() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}

export default App;
