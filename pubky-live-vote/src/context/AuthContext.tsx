import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { PubkyClient, ensurePubkyClient } from '../services/pubkyClient';

type User = {
  publicKey: string;
  displayName?: string;
};

type AuthContextValue = {
  user: User | null;
  qrCodeSvg: string | null;
  isAuthenticating: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  client: PubkyClient | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'pubky-live-vote:session';

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [client, setClient] = useState<PubkyClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null);
  const [isAuthenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    void (async () => {
      const sdk = await ensurePubkyClient();
      setClient(sdk);
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as User;
        setUser(parsed);
      }
    })();
  }, []);

  const connect = useCallback(async () => {
    if (!client) {
      const sdk = await ensurePubkyClient();
      setClient(sdk);
    }
    const sdk = client ?? (await ensurePubkyClient());
    setAuthenticating(true);
    try {
      const login = await sdk.beginRingLogin();
      setQrCodeSvg(login.qrCodeSvg);
      const session = await sdk.waitForSession(login.sessionToken);
      const userPayload: User = {
        publicKey: session.publicKey,
        displayName: session.displayName
      };
      setUser(userPayload);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userPayload));
    } catch (error) {
      console.warn('Pubky login failed', error);
    } finally {
      setAuthenticating(false);
    }
  }, [client]);

  const disconnect = useCallback(() => {
    setUser(null);
    setQrCodeSvg(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ user, qrCodeSvg, isAuthenticating, connect, disconnect, client }),
    [user, qrCodeSvg, isAuthenticating, connect, disconnect, client]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
