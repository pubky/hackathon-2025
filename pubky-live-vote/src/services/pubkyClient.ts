declare global {
  interface Window {
    __PUBKY_CONFIG__?: {
      homeserverUrl?: string;
      homeserverPublicKey?: string;
    };
  }
}

const STAGING_SERVER = 'https://homeserver.staging.pubky.app';
const STAGING_PUBLIC_KEY = 'ufibwbmed6jeq9k4p583go95wofakh9fwpp4k734trq79pd9u1uy';

type HomeserverConfig = {
  homeserverUrl: string;
  homeserverPublicKey: string;
};

let resolvedConfig: HomeserverConfig = {
  homeserverUrl: STAGING_SERVER,
  homeserverPublicKey: STAGING_PUBLIC_KEY
};

export interface PubkySession {
  publicKey: string;
  displayName?: string;
}

export interface RingLogin {
  sessionToken: string;
  qrCodeSvg: string;
}

export interface PubkyClient {
  beginRingLogin: () => Promise<RingLogin>;
  waitForSession: (sessionToken: string) => Promise<PubkySession>;
  storeBallot: (path: string, payload: unknown) => Promise<void>;
}

let cachedClient: PubkyClient | null = null;

export const ensurePubkyClient = async (): Promise<PubkyClient> => {
  if (cachedClient) return cachedClient;
  try {
    const mod: any = await import('@synonymdev/pubky');
    const adapter = await createAdapter(mod);
    if (adapter) {
      cachedClient = adapter;
      return adapter;
    }
  } catch (error) {
    console.warn('Falling back to mock Pubky client', error);
  }
  cachedClient = createMockClient();
  return cachedClient;
};

export const getHomeserverConfig = (): HomeserverConfig => resolvedConfig;

const createAdapter = async (lib: any): Promise<PubkyClient | null> => {
  if (!lib) return null;
  const sdk = await resolveSdkInstance(lib);
  if (!sdk) return null;

  const beginRingLogin =
    typeof sdk.beginRingLogin === 'function'
      ? sdk.beginRingLogin.bind(sdk)
      : typeof sdk.createRingLogin === 'function'
        ? sdk.createRingLogin.bind(sdk)
        : null;

  const waitForSession =
    typeof sdk.waitForSession === 'function'
      ? sdk.waitForSession.bind(sdk)
      : typeof sdk.pollRingLogin === 'function'
        ? sdk.pollRingLogin.bind(sdk)
        : null;

  const storeBallot = async (path: string, payload: unknown) => {
    if (typeof sdk.storeBallot === 'function') {
      await sdk.storeBallot(path, payload);
      return;
    }
    if (typeof sdk.put === 'function') {
      await sdk.put(path, payload);
      return;
    }
    if (typeof sdk.write === 'function') {
      await sdk.write(path, payload);
      return;
    }
    throw new Error('Pubky SDK does not expose a storage method');
  };

  if (!beginRingLogin || !waitForSession) {
    return null;
  }

  return {
    beginRingLogin,
    waitForSession,
    storeBallot
  };
};

const resolveSdkInstance = async (lib: any) => {
  if (!lib) return null;
  const config = typeof window !== 'undefined' ? window.__PUBKY_CONFIG__ : undefined;
  const homeserverUrl = config?.homeserverUrl ?? STAGING_SERVER;
  const homeserverPublicKey = config?.homeserverPublicKey ?? STAGING_PUBLIC_KEY;
  resolvedConfig = { homeserverUrl, homeserverPublicKey };
  if (typeof lib.testnet === 'function') {
    return lib.testnet();
  }
  if (lib?.Pubky?.testnet) {
    return lib.Pubky.testnet();
  }
  if (lib?.Pubky?.fromHomeserver) {
    return lib.Pubky.fromHomeserver({
      homeserverUrl,
      homeserverPublicKey
    });
  }
  if (typeof lib.default === 'function') {
    return lib.default({ homeserverUrl, homeserverPublicKey });
  }
  return lib;
};

const createMockClient = (): PubkyClient => {
  resolvedConfig = { homeserverUrl: STAGING_SERVER, homeserverPublicKey: STAGING_PUBLIC_KEY };
  let pendingLogin: RingLogin | null = null;
  return {
    beginRingLogin: async () => {
      const sessionToken = crypto.randomUUID();
      const qrCodeSvg = createPlaceholderQr(sessionToken);
      pendingLogin = { sessionToken, qrCodeSvg };
      // Auto-complete mock session after short delay.
      setTimeout(() => {
        if (!pendingLogin) return;
        localStorage.setItem(
          `pubky-live-vote:mock-session:${pendingLogin.sessionToken}`,
          JSON.stringify({
            publicKey: 'mock-public-key',
            displayName: 'Mock Voter'
          })
        );
      }, 800);
      return pendingLogin;
    },
    waitForSession: async (sessionToken: string) => {
      const key = `pubky-live-vote:mock-session:${sessionToken}`;
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const stored = localStorage.getItem(key);
        if (stored) {
          localStorage.removeItem(key);
          const session = JSON.parse(stored) as PubkySession;
          return session;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      return { publicKey: 'mock-public-key', displayName: 'Offline Voter' };
    },
    storeBallot: async (path: string, payload: unknown) => {
      const key = `pubky-live-vote:mock-storage:${path}`;
      localStorage.setItem(key, JSON.stringify(payload));
    }
  };
};

const createPlaceholderQr = (seed: string) => {
  const text = seed.slice(0, 8).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
    <rect width="120" height="120" rx="16" fill="#0ea5e9" />
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="16" fill="#0f172a">${text}</text>
    <text x="50%" y="72%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#082f49">Scan with Pubky</text>
  </svg>`;
};
