import { pubkyClient } from './pubky';
import { ConsentSession, CanonicalConsentObject } from '../types';

export interface HomeserverAgreement {
  session: ConsentSession;
  canonical_object: CanonicalConsentObject;
  canonical_hash: string;
  stored_at: string;
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface DetailedError {
  message: string;
  httpStatus?: number;
  errorType?: string;
  timestamp: string;
  rawError?: any;
  stack?: string;
}

export async function storeAgreementOnCurrentUserHomeserver(
  session: ConsentSession,
  canonicalObject: CanonicalConsentObject,
  canonicalHash: string,
  retryCount: number = 0
): Promise<{ success: boolean; url?: string; error?: string; detailedError?: DetailedError }> {
  const timestamp = new Date().toISOString();

  try {
    console.log('[HomeserverStorage] Storing agreement on current user\'s homeserver:', {
      sessionId: session.id,
      attempt: retryCount + 1,
      maxAttempts: MAX_RETRY_ATTEMPTS,
      timestamp
    });

    const agreement: HomeserverAgreement = {
      session,
      canonical_object: canonicalObject,
      canonical_hash: canonicalHash,
      stored_at: timestamp
    };

    const url = await pubkyClient.writeAgreement(session.id, agreement);

    console.log('[HomeserverStorage] Agreement stored successfully on current user\'s homeserver:', {
      url,
      attempt: retryCount + 1,
      timestamp: new Date().toISOString()
    });

    return { success: true, url };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorType = error?.constructor?.name || 'UnknownError';

    const httpStatusMatch = errorMessage.match(/\b(\d{3})\b/);
    const httpStatus = httpStatusMatch ? parseInt(httpStatusMatch[1]) : undefined;

    const detailedError: DetailedError = {
      message: errorMessage,
      httpStatus,
      errorType,
      timestamp,
      rawError: error,
      stack: errorStack
    };

    console.error('[HomeserverStorage] Failed to store agreement on current user homeserver:', {
      error,
      errorMessage,
      errorStack,
      errorType,
      httpStatus,
      sessionId: session.id,
      attempt: retryCount + 1,
      maxAttempts: MAX_RETRY_ATTEMPTS,
      fullError: error
    });

    if (retryCount < MAX_RETRY_ATTEMPTS - 1) {
      const delayMs = RETRY_DELAY_MS * (retryCount + 1);
      console.log(`[HomeserverStorage] Retrying in ${delayMs}ms... (attempt ${retryCount + 2}/${MAX_RETRY_ATTEMPTS})`);
      await delay(delayMs);
      return storeAgreementOnCurrentUserHomeserver(session, canonicalObject, canonicalHash, retryCount + 1);
    }

    return {
      success: false,
      error: errorMessage,
      detailedError
    };
  }
}

export function getHomeserverStorageStatus(session: ConsentSession): {
  isFullyStored: boolean;
  isPartiallyStored: boolean;
  storedCount: number;
  missingHomeservers: string[];
  urls: { a?: string; b?: string };
} {
  const aStored = session.a_homeserver_stored === true;
  const bStored = session.b_homeserver_stored === true;
  const storedCount = (aStored ? 1 : 0) + (bStored ? 1 : 0);

  const missingHomeservers: string[] = [];
  if (!aStored) missingHomeservers.push('Person A');
  if (!bStored) missingHomeservers.push('Person B');

  return {
    isFullyStored: aStored && bStored,
    isPartiallyStored: storedCount > 0 && storedCount < 2,
    storedCount,
    missingHomeservers,
    urls: {
      a: session.a_homeserver_url || undefined,
      b: session.b_homeserver_url || undefined
    }
  };
}
