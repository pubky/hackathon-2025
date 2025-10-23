import { Pubky, PublicKey, Session, PublicStorage } from '@synonymdev/pubky';

export const RELAY_URL = 'https://httprelay.pubky.app/link';
export const APP_NAMESPACE = '/pub/consentky.app';
export const CAPABILITIES = `${APP_NAMESPACE}:rw`;

export class SessionExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

class PubkyClientWrapper {
  private pubky: Pubky;
  private pubkyStorage: PublicStorage;
  private currentSession: { pubky: string; capabilities: string } | null = null;
  private currentPubkySession: Session | null = null;
  private currentPublicKey: PublicKey | null = null;
  private isClientReady: boolean = false;
  private canPerformWrites: boolean = false;

  constructor() {
    this.pubky = new Pubky();
    this.pubkyStorage = this.pubky.publicStorage;
  }

  async initiateAuth(pendingJoinId?: string) {
    console.log('[Pubky] Initiating auth with:', { RELAY_URL, CAPABILITIES, pendingJoinId });

    try {
      const authFlow = this.pubky.startAuthFlow(CAPABILITIES, RELAY_URL);
      const authURL = authFlow.authorizationUrl;

      return {
        authURL,
        waitForResponse: async () => {
          const timeout = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Authentication timeout. Please try again.')), 120000);
          });

          try {
            const session: Session = await Promise.race([authFlow.awaitApproval(), timeout]);
            const pubkyStr = session.info.publicKey.z32();

            this.currentPubkySession = session;
            this.currentPublicKey = session.info.publicKey;
            this.currentSession = {
              pubky: pubkyStr,
              capabilities: CAPABILITIES
            };
            this.canPerformWrites = true;

            console.log('[Pubky] Auth successful. Initializing homeserver namespace...');

            try {
              await this.initializeNamespace(pubkyStr);
              this.isClientReady = true;
              console.log('[Pubky] Homeserver initialized successfully:', {
                pubky: pubkyStr,
                capabilities: CAPABILITIES,
                isClientReady: this.isClientReady,
                canPerformWrites: this.canPerformWrites
              });
            } catch (error) {
              console.warn('[Pubky] Namespace initialization failed (may already exist):', error);
              this.isClientReady = true;
            }

            return this.currentSession;
          } catch (error) {
            console.error('[Pubky] Auth wait failed:', error);
            throw error;
          }
        }
      };
    } catch (error) {
      console.error('[Pubky] Failed to initiate auth:', error);
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          throw new Error('Network error. Please check your connection and try again.');
        }
      }
      throw new Error('Failed to initiate authentication. Please try again.');
    }
  }

  async createAuthURLForSession(pendingJoinId: string): Promise<string> {
    console.log('[Pubky] Creating auth URL for session join:', { RELAY_URL, CAPABILITIES, pendingJoinId });
    const authFlow = this.pubky.startAuthFlow(CAPABILITIES, RELAY_URL);
    const authURL = authFlow.authorizationUrl;

    const url = new URL(authURL);
    url.searchParams.set('pendingJoin', pendingJoinId);
    const finalAuthURL = url.toString();

    console.log('[Pubky] Final auth URL with pending join:', finalAuthURL);
    return finalAuthURL;
  }

  private async initializeNamespace(pubky: string) {
    if (!this.currentPubkySession) {
      throw new Error('No active session');
    }

    const manifestPath = `${APP_NAMESPACE}/manifest.json`;
    const manifest = {
      name: 'ConsentKy',
      version: '1.0.0',
      initialized: new Date().toISOString()
    };

    try {
      await this.currentPubkySession.storage.putJson(manifestPath, manifest);
      console.log('[Pubky] Namespace initialized:', manifestPath);
    } catch (error) {
      if (error instanceof Error && !error.message.includes('already exists')) {
        throw error;
      }
    }
  }

  getSession() {
    return this.currentSession;
  }

  private async verifyClientReady() {
    if (!this.currentSession) {
      throw new Error('No active session. Please sign in first.');
    }

    if (!this.currentPublicKey) {
      console.log('[Pubky] Rebuilding PublicKey from session...');
      try {
        this.currentPublicKey = PublicKey.from(this.currentSession.pubky);
        console.log('[Pubky] PublicKey rebuilt successfully');
      } catch (error) {
        console.error('[Pubky] Failed to rebuild PublicKey:', error);
        throw new Error('Authentication state invalid. Please sign out and sign in again.');
      }
    }

    this.isClientReady = true;
    console.log('[Pubky] Client ready for operations:', {
      hasPubky: !!this.currentSession.pubky,
      hasPublicKey: !!this.currentPublicKey,
      capabilities: this.currentSession.capabilities
    });
  }

  async writeAgreement(agreementId: string, agreementData: object) {
    console.log('[Pubky] writeAgreement called:', {
      hasCurrentSession: !!this.currentSession,
      hasPubkySession: !!this.currentPubkySession,
      canPerformWrites: this.canPerformWrites,
      isClientReady: this.isClientReady
    });

    await this.verifyClientReady();

    if (!this.currentSession?.pubky) {
      console.error('[Pubky] No active session found');
      throw new Error('No active session. Please sign in first.');
    }

    if (!this.currentPubkySession || !this.canPerformWrites) {
      console.warn('[Pubky] Write session expired or not available. Re-authentication required.', {
        hasPubkySession: !!this.currentPubkySession,
        canPerformWrites: this.canPerformWrites
      });
      throw new SessionExpiredError('Your session has expired. Please re-authenticate to continue.');
    }

    const path = `${APP_NAMESPACE}/agreements/${agreementId}`;
    const url = `pubky://${this.currentSession.pubky}${path}`;
    const startTime = Date.now();

    console.log('[Pubky] Attempting to write agreement to current user\'s homeserver:', {
      path,
      currentUserPubky: this.currentSession.pubky,
      agreementId,
      isClientReady: this.isClientReady,
      hasSession: !!this.currentSession,
      hasPublicKey: !!this.currentPublicKey,
      timestamp: new Date().toISOString()
    });

    try {
      console.log('[Pubky] Checking session before PUT:', {
        hasPublicKey: !!this.currentPublicKey,
        pubkyMatches: this.currentPublicKey?.z32() === this.currentSession.pubky,
        capabilities: this.currentSession.capabilities
      });

      await this.currentPubkySession.storage.putJson(path, agreementData);
      const duration = Date.now() - startTime;
      console.log('[Pubky] Agreement written successfully to current user\'s homeserver:', {
        url,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      return url;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorType = error?.constructor?.name || 'UnknownError';

      const errorDetails = {
        rawError: error,
        errorMessage,
        errorStack,
        errorType,
        errorString: String(error),
        url,
        currentUserPubky: this.currentSession.pubky,
        agreementId,
        duration: `${duration}ms`,
        isClientReady: this.isClientReady,
        hasSession: !!this.currentSession,
        hasPublicKey: !!this.currentPublicKey,
        timestamp: new Date().toISOString(),
        allErrorProps: error ? Object.getOwnPropertyNames(error) : []
      };

      if (error && typeof error === 'object') {
        for (const key of Object.keys(error)) {
          if (!errorDetails[key]) {
            errorDetails[key] = error[key];
          }
        }
      }

      console.error('[Pubky] Failed to write agreement - DETAILED ERROR:', errorDetails);

      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        const httpStatusMatch = errorMsg.match(/\b(\d{3})\b/);
        const httpStatus = httpStatusMatch ? httpStatusMatch[1] : 'unknown';

        console.error('[Pubky] Error analysis:', {
          containsNotFound: errorMsg.includes('404') || errorMsg.includes('not found'),
          containsAuth: errorMsg.includes('401') || errorMsg.includes('403') || errorMsg.includes('unauthorized') || errorMsg.includes('forbidden'),
          containsNetwork: errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('connection'),
          containsTimeout: errorMsg.includes('timeout'),
          detectedHttpStatus: httpStatus,
          originalErrorMessage: error.message
        });

        if (errorMsg.includes('404') || errorMsg.includes('not found')) {
          throw new Error(`Homeserver endpoint not found (HTTP ${httpStatus}). URL: ${url}. Your homeserver may be temporarily unavailable or the endpoint doesn't exist. Original error: ${error.message}`);
        } else if (errorMsg.includes('401') || errorMsg.includes('403') || errorMsg.includes('unauthorized') || errorMsg.includes('forbidden')) {
          throw new Error(`Authentication failed (HTTP ${httpStatus}). Please sign out and sign in again to refresh your session. Original error: ${error.message}`);
        } else if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('connection')) {
          throw new Error(`Network error. Please check your connection and try again. Original error: ${error.message}`);
        } else if (errorMsg.includes('timeout')) {
          throw new Error(`Request timed out after ${duration}ms. Your homeserver may be slow to respond. Please try again. Original error: ${error.message}`);
        }
      }

      throw new Error(`Failed to save to homeserver: ${errorMessage} (URL: ${url}, Duration: ${duration}ms)`);
    }
  }

  async writePost(pubky: string, postId: string, content: string) {
    await this.verifyClientReady();

    if (!this.currentPubkySession) {
      throw new Error('No active session. Please sign in first.');
    }

    const timestamp = new Date().toISOString();
    const postData = {
      content,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const path = `${APP_NAMESPACE}/posts/${postId}`;
    const url = `pubky://${pubky}${path}`;

    console.log('[Pubky] Attempting to write post:', {
      path,
      pubky,
      postId,
      contentLength: content.length,
      timestamp,
      isClientReady: this.isClientReady,
      hasSession: !!this.currentSession,
      hasPublicKey: !!this.currentPublicKey
    });

    try {
      await this.currentPubkySession.storage.putJson(path, postData);
      console.log('[Pubky] Post written successfully:', url);
      return url;
    } catch (error) {
      console.error('[Pubky] Failed to write post:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        url,
        pubky,
        postId,
        isClientReady: this.isClientReady,
        hasSession: !!this.currentSession,
        hasPublicKey: !!this.currentPublicKey
      });

      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();

        if (errorMsg.includes('404') || errorMsg.includes('not found')) {
          throw new Error('Homeserver endpoint not found. The Pubky service may be temporarily unavailable.');
        } else if (errorMsg.includes('401') || errorMsg.includes('403') || errorMsg.includes('unauthorized') || errorMsg.includes('forbidden')) {
          throw new Error('Authentication failed. Please sign out and sign in again.');
        } else if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('connection')) {
          throw new Error('Network error. Please check your connection and try again.');
        } else if (errorMsg.includes('timeout')) {
          throw new Error('Request timed out. Please try again.');
        }
      }

      throw new Error('Failed to write post. Please try again or sign out and sign in again.');
    }
  }

  async readPost(homeserverUrl: string) {
    const response = await this.pubkyStorage.get(homeserverUrl);

    if (!response.ok) {
      throw new Error('Post not found');
    }

    return await response.json();
  }

  async listPosts(pubky: string) {
    const posts = await this.pubkyStorage.list(
      `pubky://${pubky}${APP_NAMESPACE}/posts/`,
      null,
      true,
      100
    );
    return posts;
  }

  async deletePost(homeserverUrl: string) {
    if (!this.currentPubkySession) {
      throw new Error('No active session. Please sign in first.');
    }
    const path = homeserverUrl.replace(`pubky://${this.currentSession?.pubky}`, '');
    await this.currentPubkySession.storage.delete(path);
  }

  async signOut(pubky: string) {
    try {
      if (this.currentPubkySession) {
        await this.currentPubkySession.signout();
      }
    } catch (error) {
      console.warn('[Pubky] Signout failed (may not be connected):', error);
    }
    this.currentSession = null;
    this.currentPubkySession = null;
    this.currentPublicKey = null;
    this.isClientReady = false;
    this.canPerformWrites = false;
  }

  async restoreSession(session: { pubky: string; capabilities: string }) {
    console.log('[Pubky] Attempting to restore session:', { pubky: session.pubky });

    this.currentSession = session;

    try {
      const publicKey = PublicKey.from(session.pubky);
      this.currentPublicKey = publicKey;
      this.currentPubkySession = null;
      this.canPerformWrites = false;
      this.isClientReady = true;

      console.log('[Pubky] Session restored successfully (read-only mode - write operations will require re-authentication):', {
        pubky: session.pubky,
        capabilities: session.capabilities,
        isClientReady: this.isClientReady,
        canPerformWrites: this.canPerformWrites,
        note: 'Full Pubky Session not available - re-authentication needed for writes'
      });
    } catch (error) {
      console.error('[Pubky] Failed to restore session:', error);
      this.currentPublicKey = null;
      this.currentSession = null;
      this.currentPubkySession = null;
      this.isClientReady = false;
      this.canPerformWrites = false;
      throw new Error('Failed to restore session. Please sign in again.');
    }
  }
}

export const pubkyClient = new PubkyClientWrapper();
