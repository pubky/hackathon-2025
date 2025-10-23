import { AuthFlow, Pubky, type PublicStorage, type Session } from '@synonymdev/pubky';

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
const STAGING_CONFIG: HomeserverConfig = {
  homeserverUrl: STAGING_HOMESERVER_URL,
  homeserverPublicKey: STAGING_HOMESERVER_PUBLIC_KEY
};
const TESTNET_HOMESERVER_URL = 'http://localhost:8787';
const TESTNET_HOMESERVER_PUBLIC_KEY = '8pinxxgqs41n4aididenw5apqp1urfmzdztr8jt4abrkdn435ewo';

const envHomeserverUrl = import.meta.env.VITE_PUBKY_HOMESERVER_URL?.trim();
const envHomeserverPublicKey = import.meta.env.VITE_PUBKY_HOMESERVER_PUBLIC_KEY?.trim();

const DEFAULT_HOMESERVER_URL = envHomeserverUrl || (import.meta.env.DEV ? TESTNET_HOMESERVER_URL : STAGING_HOMESERVER_URL);
const DEFAULT_HOMESERVER_PUBLIC_KEY =
  envHomeserverPublicKey || (import.meta.env.DEV ? TESTNET_HOMESERVER_PUBLIC_KEY : STAGING_HOMESERVER_PUBLIC_KEY);

const AUTH_CAPABILITIES = '/pub/pubky-live-vote/:rw';
const DEFAULT_AUTH_RELAY = 'https://httprelay.pubky.app/link/';
const MOCK_STORAGE_PREFIX = 'pubky-live-vote:mock-storage:';

type HomeserverConfig = {
  homeserverUrl: string;
  homeserverPublicKey: string;
};

export type AuthMethod = 'approval';

export interface SessionResult {
  session: Session;
  method: AuthMethod;
  publicKey: string;
}

export interface AuthSessionHandle {
  authorizationUrl: string;
  awaitApproval: () => Promise<SessionResult>;
  cancel: () => void;
}

export interface PubkyClient {
  startAuthSession: () => Promise<AuthSessionHandle>;
  cancelActiveFlow: () => void;
  signout: () => Promise<void>;
  session: Session | null;
  sessionPublicKey: string | null;
  publicStorage: PublicStorage | null;
}

function resolveDefaultHomeserverUrl(): string {
  return DEFAULT_HOMESERVER_URL;
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

const isNetworkUnreachableError = (error: unknown): boolean => {
  if (error instanceof TypeError) return true;
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network error') ||
    message.includes('load failed') ||
    message.includes('econnrefused') ||
    message.includes('econnreset')
  );
};

const createPubkyClient = (): PubkyClient => {
  const configOverride = typeof window !== 'undefined' ? window.__PUBKY_CONFIG__ : undefined;
  const homeserverUrl = configOverride?.homeserverUrl ?? resolveDefaultHomeserverUrl();
  const homeserverPublicKey = configOverride?.homeserverPublicKey ?? DEFAULT_HOMESERVER_PUBLIC_KEY;
  const config: HomeserverConfig = {
    homeserverUrl,
    homeserverPublicKey
  };

  const hostname = parseHostname(homeserverUrl);
  const isDefaultLocalTestnet =
    !configOverride?.homeserverUrl &&
    !envHomeserverUrl &&
    import.meta.env.DEV &&
    isLocalHostname(hostname);

  return createPubkyClientWithConfig(config, { allowStagingFallback: isDefaultLocalTestnet });
};

const createPubkyClientWithConfig = (
  config: HomeserverConfig,
  { allowStagingFallback }: { allowStagingFallback: boolean }
): PubkyClient => {
  resolvedConfig = config;

  const pubky = new Pubky();
  const publicStorage = pubky.publicStorage;

  let session: Session | null = null;
  let sessionPublicKey: string | null = null;
  let activeFlow: AuthFlow | null = null;

  const releaseFlow = (flow: AuthFlow | null) => {
    if (!flow) return;
    try {
      flow.free();
    } catch (error) {
      console.warn('Pubky auth flow cleanup failed', error);
    }
    if (activeFlow === flow) {
      activeFlow = null;
    }
  };

  const cancelActiveFlow = () => {
    if (activeFlow) {
      releaseFlow(activeFlow);
    }
  };

  const startAuthSession = async (): Promise<AuthSessionHandle> => {
    if (session) {
      const activeSession = session;
      const publicKey = sessionPublicKey ?? activeSession.info.publicKey.z32();
      return {
        authorizationUrl: '',
        awaitApproval: async () => ({ session: activeSession, method: 'approval', publicKey }),
        cancel: () => {}
      };
    }

    cancelActiveFlow();

    let flow: AuthFlow;
    try {
      flow = pubky.startAuthFlow(AUTH_CAPABILITIES, DEFAULT_AUTH_RELAY);
    } catch (error) {
      if (allowStagingFallback && isNetworkUnreachableError(error)) {
        const fallbackClient = fallbackToStagingHomeserver(client, error);
        return fallbackClient.startAuthSession();
      }
      if (isNetworkUnreachableError(error)) {
        const fallbackClient = fallbackToMockClient(client, error);
        return fallbackClient.startAuthSession();
      }
      throw error;
    }

    activeFlow = flow;

    const awaitApproval = async (): Promise<SessionResult> => {
      try {
        const approvedSession = await flow.awaitApproval();
        session = approvedSession;
        const publicKey = approvedSession.info.publicKey.z32();
        sessionPublicKey = publicKey;
        client.session = session;
        client.sessionPublicKey = publicKey;
        return { session: approvedSession, method: 'approval', publicKey };
      } finally {
        releaseFlow(flow);
      }
    };

    const cancel = () => {
      releaseFlow(flow);
    };

    return {
      authorizationUrl: flow.authorizationUrl,
      awaitApproval,
      cancel
    };
  };

  const signout = async () => {
    cancelActiveFlow();
    if (!session) return;
    try {
      await session.signout();
    } catch (error) {
      console.warn('Pubky signout failed', error);
    } finally {
      session = null;
      sessionPublicKey = null;
      client.session = null;
      client.sessionPublicKey = null;
    }
  };

  const client: PubkyClient = {
    startAuthSession,
    cancelActiveFlow,
    signout,
    session: null,
    sessionPublicKey: null,
    publicStorage
  };

  return client;
};

const fallbackToStagingHomeserver = (clientToReplace: PubkyClient, cause: unknown): PubkyClient => {
  console.warn('Configured Pubky homeserver unavailable, falling back to staging homeserver', cause);
  const stagingClient = createPubkyClientWithConfig(STAGING_CONFIG, { allowStagingFallback: false });
  cachedClient = stagingClient;
  Object.assign(clientToReplace, stagingClient);
  return stagingClient;
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
  let mockSession: Session | null = null;

  const startAuthSession = async (): Promise<AuthSessionHandle> => {
    if (!mockSession || !sessionPublicKey) {
      sessionPublicKey = 'mock-public-key';
      mockSession = createMockSession(sessionPublicKey);
    }
    client.session = mockSession;
    client.sessionPublicKey = sessionPublicKey;
    return {
      authorizationUrl: 'https://mock.pubky.app/link',
      awaitApproval: async () => ({
        session: mockSession as Session,
        method: 'approval',
        publicKey: sessionPublicKey as string
      }),
      cancel: () => {}
    };
  };

  const cancelActiveFlow = () => {
    /* no-op */
  };

  const signout = async () => {
    sessionPublicKey = null;
    mockSession = null;
    client.session = null;
    client.sessionPublicKey = null;
  };

  const client: PubkyClient = {
    startAuthSession,
    cancelActiveFlow,
    signout,
    session: mockSession,
    sessionPublicKey,
    publicStorage: null
  };

  return client;
};

const fallbackToMockClient = (clientToReplace: PubkyClient, cause: unknown): PubkyClient => {
  console.warn('Falling back to mock Pubky client after homeserver bootstrap failure', cause);
  const mockClient = createMockClient();
  cachedClient = mockClient;
  Object.assign(clientToReplace, mockClient);
  return mockClient;
};

const hasBrowserStorage = () => typeof window !== 'undefined' && !!window.localStorage;

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
