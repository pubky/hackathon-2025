import { useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import './Panel.css';

export const LoginCard = () => {
  const { user, session, authMethod, isAuthenticating, connect, disconnect } = useAuth();
  const hasAttemptedAutoConnect = useRef(false);

  useEffect(() => {
    if (session || isAuthenticating || hasAttemptedAutoConnect.current) {
      return;
    }
    hasAttemptedAutoConnect.current = true;
    void connect();
  }, [session, isAuthenticating, connect]);

  const handleConnect = useCallback(() => {
    hasAttemptedAutoConnect.current = true;
    void connect();
  }, [connect]);

  const statusMessage = useMemo(() => {
    if (session) return '';
    if (isAuthenticating) {
      if (authMethod === 'signup') {
        return 'Creating a new Pubky testnet identity…';
      }
      if (authMethod === 'signin') {
        return 'Signing in with your Pubky identity…';
      }
      return 'Connecting to the Pubky testnet…';
    }
    if (hasAttemptedAutoConnect.current) {
      return 'Unable to establish a Pubky session. Retry the connection to continue.';
    }
    return 'Connect to Pubky to start voting.';
  }, [session, isAuthenticating, authMethod]);

  const publicKey = useMemo(() => {
    if (session) {
      try {
        return session.info.publicKey.z32();
      } catch (error) {
        console.warn('Unable to read session public key', error);
      }
    }
    return user?.publicKey ?? null;
  }, [session, user]);

  return (
    <div className="panel">
      <header className="panel__header">
        <div>
          <h2>{session ? 'Connected to Pubky' : 'Connect to Pubky'}</h2>
          <p className="panel__subtitle">
            {session
              ? 'Your Pubky identity is active. You can vote, comment, and tag projects.'
              : 'We’ll establish a direct session with the Pubky testnet—no QR code required.'}
          </p>
        </div>
        {session && (
          <button className="button button--ghost" onClick={() => void disconnect()}>
            Sign out
          </button>
        )}
      </header>

      {!session && (
        <div className="qr-wrapper" aria-live="polite">
          <div className="qr-placeholder">{statusMessage}</div>
        </div>
      )}

      {!session && (
        <div className="panel__actions">
          <button className="button button--primary" disabled={isAuthenticating} onClick={handleConnect}>
            {isAuthenticating ? 'Connecting…' : 'Connect to Pubky'}
          </button>
        </div>
      )}

      {session && (
        <dl className="identity-list">
          <div>
            <dt>Authentication</dt>
            <dd>{authMethod === 'signup' ? 'Signed up to the homeserver' : 'Signed in with existing keys'}</dd>
          </div>
          <div>
            <dt>Public Key</dt>
            <dd className="mono">{publicKey ?? 'Unknown'}</dd>
          </div>
        </dl>
      )}
    </div>
  );
};
