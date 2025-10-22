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
  disconnect: () => Promise<void>;
  client: PubkyClient | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'pubky-live-vote:session';

const SIGNOUT_METHOD_NAMES = ['signOut', 'logout', 'disconnect', 'endSession', 'close', 'clearSession'];
const SIGNOUT_NESTED_KEYS = ['auth', 'authentication', 'session', 'sessions'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const resolveSignoutMethod = (source: unknown, visited = new Set<unknown>()): (() => Promise<void> | void) | null => {
  if (!isRecord(source) || visited.has(source)) return null;
  visited.add(source);
  for (const name of SIGNOUT_METHOD_NAMES) {
    const candidate = source[name];
    if (typeof candidate === 'function') {
      return candidate.bind(source);
    }
  }
  for (const key of SIGNOUT_NESTED_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    const nested = source[key];
    if (!isRecord(nested)) continue;
    const candidate = resolveSignoutMethod(nested, visited);
    if (candidate) {
      return candidate;
    }
  }
  for (const value of Object.values(source)) {
    if (!isRecord(value)) continue;
    const candidate = resolveSignoutMethod(value, visited);
    if (candidate) {
      return candidate;
    }
  }
  return null;
};

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

  const disconnect = useCallback(async () => {
    try {
      const target = client ?? (await ensurePubkyClient());
      const signoutCandidate = resolveSignoutMethod(target);
      if (signoutCandidate) {
        await signoutCandidate();
      }
    } catch (error) {
      console.warn('Pubky logout failed', error);
    } finally {
      setUser(null);
      setQrCodeSvg(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [client]);

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
