import { Keypair, Pubky, PublicKey, type PublicStorage, type Session, type Signer } from '@synonymdev/pubky';

declare global {
  interface Window {
    __PUBKY_CONFIG__?: {
      homeserverUrl?: string;
      homeserverPublicKey?: string;
    };
  }
}

const DEFAULT_TESTNET_HOST = 'localhost';
const DEFAULT_HOMESERVER_URL = 'http://localhost:8787';
const HOMESERVER_PUBLIC_KEY = '8pinxxgqs41n4aididenw5apqp1urfmzdztr8jt4abrkdn435ewo';
const KEYPAIR_STORAGE_KEY = 'pubky-live-vote:keypair-secret';
const MOCK_STORAGE_PREFIX = 'pubky-live-vote:mock-storage:';

type HomeserverConfig = {
  homeserverUrl: string;
  homeserverPublicKey: string;
};

const resolveDefaultHomeserverUrl = () => {
  if (import.meta.env.DEV && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return DEFAULT_HOMESERVER_URL;
};

export type AuthMethod = 'signin' | 'signup';

export interface SessionResult {
  session: Session;
  method: AuthMethod;
  publicKey: string;
}

export interface PubkyClient {
  ensureSession: () => Promise<SessionResult>;
  storeBallot: (path: string, payload: unknown) => Promise<void>;
  signout: () => Promise<void>;
  session: Session | null;
  sessionPublicKey: string | null;
  lastAuthMethod: AuthMethod | null;
  publicStorage: PublicStorage | null;
}

let resolvedConfig: HomeserverConfig = {
  homeserverUrl: resolveDefaultHomeserverUrl(),
  homeserverPublicKey: HOMESERVER_PUBLIC_KEY
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

const createPubkyClient = (): PubkyClient => {
  const config = typeof window !== 'undefined' ? window.__PUBKY_CONFIG__ : undefined;
  const homeserverUrl = config?.homeserverUrl ?? resolveDefaultHomeserverUrl();
  resolvedConfig = {
    homeserverUrl,
    homeserverPublicKey: HOMESERVER_PUBLIC_KEY
  };

  const pubky = Pubky.testnet(DEFAULT_TESTNET_HOST);
  const publicStorage = pubky.publicStorage;
  const homeserverKey = PublicKey.from(HOMESERVER_PUBLIC_KEY);

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
      if (persisted) {
        console.warn('Fast Pubky signin failed, attempting signup', error);
        session = await signupWithHomeserver(activeSigner);
        method = 'signup';
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

  const storeBallot = async (path: string, payload: unknown) => {
    const { session: activeSession } = await ensureSession();
    const normalizedPath = normalizeSessionPath(path);
    await activeSession.storage.putJson(normalizedPath, payload as any);
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
    storeBallot,
    signout,
    session: null,
    sessionPublicKey: null,
    lastAuthMethod: null,
    publicStorage
  };

  return client;
};

type SessionPath = `/pub/${string}`;

const normalizeSessionPath = (path: string): SessionPath => {
  const trimmed = path.replace(/^\/+/, '');
  if (trimmed.startsWith('pub/')) {
    return `/${trimmed}` as SessionPath;
  }
  return `/pub/${trimmed}` as SessionPath;
};

const createMockClient = (): PubkyClient => {
  resolvedConfig = {
    homeserverUrl: resolveDefaultHomeserverUrl(),
    homeserverPublicKey: HOMESERVER_PUBLIC_KEY
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

  const storeBallot = async (path: string, payload: unknown) => {
    await ensureSession();
    if (!hasBrowserStorage()) return;
    const normalized = normalizeSessionPath(path).replace(/^\/pub\//, '');
    window.localStorage.setItem(`${MOCK_STORAGE_PREFIX}${normalized}`, JSON.stringify(payload));
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
    storeBallot,
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
