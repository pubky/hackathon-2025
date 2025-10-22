import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './Panel.css';

export const LoginCard = () => {
  const { user, qrCodeSvg, isAuthenticating, connect, disconnect } = useAuth();

  useEffect(() => {
    if (!user) {
      void connect();
    }
  }, [user, connect]);

  return (
    <div className="panel">
      <header className="panel__header">
        <div>
          <h2>{user ? 'Connected to Pubky' : 'Connect with Pubky Ring'}</h2>
          <p className="panel__subtitle">
            {user ? 'Your identity is linked. You can vote, comment, and tag projects.' : 'Scan the QR code with Pubky Ring to authenticate.'}
          </p>
        </div>
        {user && (
          <button className="button button--ghost" onClick={() => void disconnect()}>
            Sign out
          </button>
        )}
      </header>

      {!user && (
        <div className="qr-wrapper" aria-live="polite">
          {qrCodeSvg ? (
            <div className="qr-container" dangerouslySetInnerHTML={{ __html: qrCodeSvg }} />
          ) : (
            <div className="qr-placeholder">{isAuthenticating ? 'Waiting for QR code…' : 'Unable to load QR code'}</div>
          )}
        </div>
      )}

      {user && (
        <dl className="identity-list">
          <div>
            <dt>Display Name</dt>
            <dd>{user.displayName ?? 'Anonymous Builder'}</dd>
          </div>
          <div>
            <dt>Public Key</dt>
            <dd className="mono">{user.publicKey}</dd>
          </div>
        </dl>
      )}
    </div>
  );
};
