import type { Session } from '@synonymdev/pubky';
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { type AuthMethod, type PubkyClient, ensurePubkyClient } from '../services/pubkyClient';

type User = {
  publicKey: string;
  displayName?: string;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  sessionStorage: Session['storage'] | null;
  authMethod: AuthMethod | null;
  isAuthenticating: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  client: PubkyClient | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'pubky-live-vote:session';

const readStoredUser = (): User | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as User;
    if (!parsed?.publicKey) return null;
    return parsed;
  } catch (error) {
    console.warn('Unable to parse stored Pubky session', error);
    return null;
  }
};

const formatDisplayName = (publicKey: string): string => {
  if (publicKey.length <= 12) return publicKey;
  return `${publicKey.slice(0, 6)}…${publicKey.slice(-4)}`;
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [client, setClient] = useState<PubkyClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null);
  const [isAuthenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    const storedUser = readStoredUser();
    if (storedUser) {
      setUser(storedUser);
      setAuthMethod('signin');
    }
    void ensurePubkyClient().then((sdk) => {
      setClient(sdk);
      if (sdk.session) {
        setSession(sdk.session);
        if (sdk.sessionPublicKey) {
          setUser({ publicKey: sdk.sessionPublicKey, displayName: formatDisplayName(sdk.sessionPublicKey) });
          setAuthMethod(sdk.lastAuthMethod ?? 'signin');
        }
      }
    });
  }, []);

  const connect = useCallback(async () => {
    const sdk = client ?? (await ensurePubkyClient());
    setClient(sdk);
    setAuthenticating(true);
    try {
      const storedUser = readStoredUser();
      setAuthMethod(storedUser ? 'signin' : 'signup');

      const result = await sdk.ensureSession();
      setSession(result.session);
      setAuthMethod(result.method);

      const userPayload: User = {
        publicKey: result.publicKey,
        displayName: formatDisplayName(result.publicKey)
      };
      setUser(userPayload);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(userPayload));
      }
    } catch (error) {
      console.warn('Pubky session establishment failed', error);
    } finally {
      setAuthenticating(false);
    }
  }, [client]);

  const disconnect = useCallback(async () => {
    try {
      const sdk = client ?? (await ensurePubkyClient());
      await sdk.signout();
    } catch (error) {
      console.warn('Pubky signout failed', error);
    } finally {
      setSession(null);
      setUser(null);
      setAuthMethod(null);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [client]);

  const sessionStorage = session?.storage ?? null;

  const value = useMemo(
    () => ({ user, session, sessionStorage, authMethod, isAuthenticating, connect, disconnect, client }),
    [user, session, sessionStorage, authMethod, isAuthenticating, connect, disconnect, client]
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
