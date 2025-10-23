import { Keypair, Pubky, PublicKey, type PublicStorage, type Session, type Signer } from '@synonymdev/pubky';

declare global {
  interface Window {
    __PUBKY_CONFIG__?: {
      homeserverUrl?: string;
      homeserverPublicKey?: string;
    };
  }
}

const STAGING_HOMESERVER_URL = 'https://homeserver.staging.pubky.app';
const STAGING_HOMESERVER_PUBLIC_KEY = 'ufibwbmed6jeq9k4p583go95wofakh9fwpp4k734trq79pd9u1uy';
const TESTNET_HOMESERVER_URL = 'http://localhost:8787';
const TESTNET_HOMESERVER_PUBLIC_KEY = '8pinxxgqs41n4aididenw5apqp1urfmzdztr8jt4abrkdn435ewo';

const envHomeserverUrl = import.meta.env.VITE_PUBKY_HOMESERVER_URL?.trim();
const envHomeserverPublicKey = import.meta.env.VITE_PUBKY_HOMESERVER_PUBLIC_KEY?.trim();

const DEFAULT_HOMESERVER_URL = envHomeserverUrl || (import.meta.env.DEV ? TESTNET_HOMESERVER_URL : STAGING_HOMESERVER_URL);
const DEFAULT_HOMESERVER_PUBLIC_KEY =
  envHomeserverPublicKey || (import.meta.env.DEV ? TESTNET_HOMESERVER_PUBLIC_KEY : STAGING_HOMESERVER_PUBLIC_KEY);
const KEYPAIR_STORAGE_KEY = 'pubky-live-vote:keypair-secret';
const MOCK_STORAGE_PREFIX = 'pubky-live-vote:mock-storage:';

type HomeserverConfig = {
  homeserverUrl: string;
  homeserverPublicKey: string;
};

const resolveDefaultHomeserverUrl = () => DEFAULT_HOMESERVER_URL;

const parseHostname = (url: string): string | null => {
  try {
    return new URL(url).hostname;
  } catch (error) {
    console.warn('Unable to parse homeserver URL hostname', error);
    return null;
  }
};

const isLocalHostname = (hostname: string | null | undefined): boolean => {
  if (!hostname) return true;
  const normalized = hostname.toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized.endsWith('.local')
  );
};

export type AuthMethod = 'signin' | 'signup';

export interface SessionResult {
  session: Session;
  method: AuthMethod;
  publicKey: string;
}

export interface PubkyClient {
  ensureSession: () => Promise<SessionResult>;
  signout: () => Promise<void>;
  session: Session | null;
  sessionPublicKey: string | null;
  lastAuthMethod: AuthMethod | null;
  publicStorage: PublicStorage | null;
}

let resolvedConfig: HomeserverConfig = {
  homeserverUrl: resolveDefaultHomeserverUrl(),
  homeserverPublicKey: DEFAULT_HOMESERVER_PUBLIC_KEY
};

let cachedClient: PubkyClient | null = null;

export const ensurePubkyClient = async (): Promise<PubkyClient> => {
  if (cachedClient) return cachedClient;
  try {
    cachedClient = createPubkyClient();
  } catch (error) {
    console.warn('Falling back to mock Pubky client', error);
    cachedClient = createMockClient();
  }
  return cachedClient;
};

export const getHomeserverConfig = (): HomeserverConfig => resolvedConfig;

const hasBrowserStorage = () => typeof window !== 'undefined' && !!window.localStorage;

const serializeSecretKey = (secret: Uint8Array): string => JSON.stringify(Array.from(secret));

const deserializeSecretKey = (payload: string): Uint8Array => {
  const parsed = JSON.parse(payload) as number[];
  return new Uint8Array(parsed);
};

const readPersistedSecret = (): Uint8Array | null => {
  if (!hasBrowserStorage()) return null;
  try {
    const stored = window.localStorage.getItem(KEYPAIR_STORAGE_KEY);
    if (!stored) return null;
    return deserializeSecretKey(stored);
  } catch (error) {
    console.warn('Unable to read persisted Pubky secret', error);
    return null;
  }
};

const persistSecret = (keypair: Keypair) => {
  if (!hasBrowserStorage()) return;
  try {
    const secret = keypair.secretKey();
    window.localStorage.setItem(KEYPAIR_STORAGE_KEY, serializeSecretKey(secret));
  } catch (error) {
    console.warn('Unable to persist Pubky secret', error);
  }
};

const isPkarrMissingHttpsError = (error: unknown): error is Error =>
  error instanceof Error &&
  error.name === 'PkarrError' &&
  (error.message.includes('No HTTPS endpoints found') ||
    error.message.includes('Pkarr record is malformed'));

const fallbackToMockClient = async (clientToReplace: PubkyClient, cause: unknown): Promise<SessionResult> => {
  console.warn('Falling back to mock Pubky client after homeserver bootstrap failure', cause);
  const mockClient = createMockClient();
  cachedClient = mockClient;
  Object.assign(clientToReplace, mockClient);
  return mockClient.ensureSession();
};

const createPubkyClient = (): PubkyClient => {
  const config = typeof window !== 'undefined' ? window.__PUBKY_CONFIG__ : undefined;
  const homeserverUrl = config?.homeserverUrl ?? resolveDefaultHomeserverUrl();
  const homeserverPublicKey = config?.homeserverPublicKey ?? DEFAULT_HOMESERVER_PUBLIC_KEY;
  resolvedConfig = {
    homeserverUrl,
    homeserverPublicKey
  };

  const homeserverHostname = parseHostname(homeserverUrl);
  const useLocalTestnet = isLocalHostname(homeserverHostname);
  const pubky = useLocalTestnet ? Pubky.testnet(homeserverHostname ?? undefined) : new Pubky();
  const publicStorage = pubky.publicStorage;
  const homeserverKey = PublicKey.from(homeserverPublicKey);

  let signer: Signer | null = null;
  let signerWasPersisted = false;
  let session: Session | null = null;
  let sessionPublicKey: string | null = null;
  let lastAuthMethod: AuthMethod | null = null;

  const ensureSigner = (): { signer: Signer; persisted: boolean } => {
    if (signer) {
      return { signer, persisted: signerWasPersisted };
    }
    const persistedSecret = readPersistedSecret();
    if (persistedSecret) {
      const existingKeypair = Keypair.fromSecretKey(persistedSecret);
      signer = pubky.signer(existingKeypair);
      signerWasPersisted = true;
      return { signer, persisted: true };
    }
    const newKeypair = Keypair.random();
    persistSecret(newKeypair);
    signer = pubky.signer(newKeypair);
    signerWasPersisted = false;
    return { signer, persisted: false };
  };

  const signupWithHomeserver = async (activeSigner: Signer) => activeSigner.signup(homeserverKey, null);

  const ensureSession = async (): Promise<SessionResult> => {
    if (session) {
      const publicKey = sessionPublicKey ?? session.info.publicKey.z32();
      return {
        session,
        method: lastAuthMethod ?? 'signin',
        publicKey
      };
    }

    const { signer: activeSigner, persisted } = ensureSigner();
    let method: AuthMethod = persisted ? 'signin' : 'signup';
    try {
      session = persisted ? await activeSigner.signin() : await signupWithHomeserver(activeSigner);
    } catch (error) {
      if (isPkarrMissingHttpsError(error)) {
        return fallbackToMockClient(client, error);
      }
      if (persisted) {
        console.warn('Fast Pubky signin failed, attempting signup', error);
        try {
          session = await signupWithHomeserver(activeSigner);
          method = 'signup';
        } catch (signupError) {
          if (isPkarrMissingHttpsError(signupError)) {
            return fallbackToMockClient(client, signupError);
          }
          throw signupError;
        }
      } else {
        throw error;
      }
    }

    sessionPublicKey = session.info.publicKey.z32();
    lastAuthMethod = method;

    client.session = session;
    client.sessionPublicKey = sessionPublicKey;
    client.lastAuthMethod = lastAuthMethod;

    return { session, method, publicKey: sessionPublicKey };
  };

  const signout = async () => {
    if (!session) return;
    try {
      await session.signout();
    } catch (error) {
      console.warn('Pubky signout failed', error);
    } finally {
      session = null;
      signer = null;
      sessionPublicKey = null;
      lastAuthMethod = null;
      client.session = null;
      client.sessionPublicKey = null;
      client.lastAuthMethod = null;
    }
  };

  const client: PubkyClient = {
    ensureSession,
    signout,
    session: null,
    sessionPublicKey: null,
    lastAuthMethod: null,
    publicStorage
  };

  return client;
};

const createMockClient = (): PubkyClient => {
  const config = typeof window !== 'undefined' ? window.__PUBKY_CONFIG__ : undefined;
  const homeserverUrl = config?.homeserverUrl ?? resolveDefaultHomeserverUrl();
  const homeserverPublicKey = config?.homeserverPublicKey ?? DEFAULT_HOMESERVER_PUBLIC_KEY;
  resolvedConfig = {
    homeserverUrl,
    homeserverPublicKey
  };
  let sessionPublicKey: string | null = null;
  let lastAuthMethod: AuthMethod | null = null;
  let mockSession: Session | null = null;

  const ensureSession = async (): Promise<SessionResult> => {
    if (mockSession && sessionPublicKey) {
      return { session: mockSession, method: lastAuthMethod ?? 'signin', publicKey: sessionPublicKey };
    }
    sessionPublicKey = 'mock-public-key';
    lastAuthMethod = 'signup';
    mockSession = createMockSession(sessionPublicKey);
    client.session = mockSession;
    client.sessionPublicKey = sessionPublicKey;
    client.lastAuthMethod = lastAuthMethod;
    return { session: mockSession, method: lastAuthMethod, publicKey: sessionPublicKey };
  };

  const signout = async () => {
    sessionPublicKey = null;
    lastAuthMethod = null;
    mockSession = null;
    client.session = null;
    client.sessionPublicKey = null;
    client.lastAuthMethod = null;
  };

  const client: PubkyClient = {
    ensureSession,
    signout,
    session: mockSession,
    sessionPublicKey,
    lastAuthMethod,
    publicStorage: null
  };

  return client;
};

const createMockSession = (publicKey: string): Session => {
  const sessionInfo = {
    publicKey: {
      z32: () => publicKey
    }
  } as unknown as Session['info'];

  const storage = {
    async putJson(path: string, payload: unknown) {
      if (!hasBrowserStorage()) return;
      const normalized = path.replace(/^\/pub\//, '');
      window.localStorage.setItem(`${MOCK_STORAGE_PREFIX}${normalized}`, JSON.stringify(payload));
    }
  } as unknown as Session['storage'];

  return {
    info: sessionInfo,
    storage,
    async signout() {
      /* no-op */
    }
  } as Session;
};
