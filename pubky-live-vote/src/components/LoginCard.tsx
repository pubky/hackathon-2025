import { useEffect, useMemo, useRef, useCallback } from 'react';
import QRCode from 'react-qr-code';
import { useAuth } from '../context/AuthContext';
import './Panel.css';

export const LoginCard = () => {
  const { user, session, authMethod, isAuthenticating, authorizationUrl, connect, disconnect } = useAuth();
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
    if (authorizationUrl) {
      return 'Scan the QR code with the Pubky app or open the link on this device.';
    }
    if (isAuthenticating) {
      return 'Preparing the Pubky auth flow…';
    }
    if (hasAttemptedAutoConnect.current) {
      return 'Unable to start the Pubky auth flow. Retry the connection to generate a new QR code.';
    }
    return 'Connect to Pubky to start voting.';
  }, [session, isAuthenticating, authorizationUrl, authMethod]);

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
              : 'Authorize the app with Pubky to start voting. Scan the QR code or open the link below.'}
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
          {authorizationUrl ? (
            <div className="qr-container">
              <QRCode value={authorizationUrl} />
              <p className="qr-caption">{statusMessage}</p>
              <a className="qr-link" href={authorizationUrl} target="_blank" rel="noreferrer">
                Open authorization link
              </a>
            </div>
          ) : (
            <div className="qr-placeholder">{statusMessage}</div>
          )}
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
            <dd>{authMethod ? 'Approved via the Pubky app' : 'Awaiting approval'}</dd>
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
