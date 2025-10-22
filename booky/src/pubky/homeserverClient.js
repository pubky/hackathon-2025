/**
 * Homeserver Client
 * Manages connection and operations with Pubky homeserver
 */

import { Pubky, PublicKey } from '@synonymdev/pubky';
import { logger } from '../utils/logger.js';

export class HomeserverClient {
  constructor() {
    this.pubky = null;
    this.session = null;
    this.signer = null;
  }

  /**
   * Initialize Pubky client
   */
  async initialize() {
    try {
      this.pubky = new Pubky();
      logger.log('Pubky client initialized');
    } catch (error) {
      logger.error('Failed to initialize client:', error);
      throw error;
    }
  }

  /**
   * Sign up a new user with a homeserver
   */
  async signup(keypair, homeserverPubkey, inviteCode = null) {
    try {
      if (!this.pubky) {
        await this.initialize();
      }

      // Create signer from keypair
      this.signer = this.pubky.signer(keypair);

      // Convert homeserver string to PublicKey
      const homeserverPk = PublicKey.from(homeserverPubkey);

      // Sign up
      this.session = await this.signer.signup(homeserverPk, inviteCode);

      logger.log('Signed up successfully to homeserver:', homeserverPubkey);
    } catch (error) {
      logger.error('Signup failed:', error);
      throw error;
    }
  }

  /**
   * Sign in with existing keypair
   */
  async signin(keypair) {
    try {
      if (!this.pubky) {
        await this.initialize();
      }

      // Create signer from keypair
      this.signer = this.pubky.signer(keypair);

      // Sign in
      this.session = await this.signer.signin();

      logger.log('Signed in successfully');
    } catch (error) {
      logger.error('Sign in failed:', error);
      throw error;
    }
  }

  /**
   * Get current session info
   */
  getSessionInfo() {
    if (!this.session) {
      throw new Error('Not signed in');
    }
    return this.session.info;
  }

  /**
   * Put data to homeserver (session path)
   */
  async put(path, data) {
    try {
      if (!this.session) {
        throw new Error('Not signed in');
      }

      const content = typeof data === 'string' ? data : JSON.stringify(data);
      await this.session.storage.putText(path, content);
      logger.log('Put data to:', path);
    } catch (error) {
      logger.error('Failed to put data:', error);
      throw error;
    }
  }

  /**
   * Get data from own session storage
   */
  async get(path) {
    try {
      if (!this.session) {
        throw new Error('Not signed in');
      }

      const data = await this.session.storage.getText(path);
      logger.log('Got data from:', path);

      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    } catch (error) {
      logger.error('Failed to get data:', error);
      throw error;
    }
  }

  /**
   * Get data from public storage (for other users)
   */
  async getPublic(address) {
    try {
      if (!this.pubky) {
        await this.initialize();
      }

      const data = await this.pubky.publicStorage.getText(address);
      logger.log('Got public data from:', address);

      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    } catch (error) {
      logger.error('Failed to get public data:', error);
      throw error;
    }
  }

  /**
   * Delete data from homeserver (session path)
   */
  async delete(path) {
    try {
      if (!this.session) {
        throw new Error('Not signed in');
      }

      await this.session.storage.delete(path);
      logger.log('Deleted from:', path);
    } catch (error) {
      logger.error('Failed to delete data:', error);
      throw error;
    }
  }

  /**
   * List entries at a session path
   */
  async list(path) {
    try {
      if (!this.session) {
        throw new Error('Not signed in');
      }

      const entries = await this.session.storage.list(path);
      logger.log('Listed entries at:', path);
      return entries;
    } catch (error) {
      logger.error('Failed to list entries:', error);
      throw error;
    }
  }

  /**
   * List entries at a public address
   */
  async listPublic(address) {
    try {
      if (!this.pubky) {
        await this.initialize();
      }

      const entries = await this.pubky.publicStorage.list(address);
      logger.log('Listed public entries at:', address);
      return entries;
    } catch (error) {
      logger.error('Failed to list public entries:', error);
      throw error;
    }
  }

  /**
   * Resolve homeserver for a pubkey using pkarr
   */
  async getHomeserverOf(pubkey) {
    try {
      if (!this.pubky) {
        await this.initialize();
      }

      const publicKey = PublicKey.from(pubkey);
      const homeserver = await this.pubky.getHomeserverOf(publicKey);

      const homeserverStr = homeserver ? homeserver.z32() : null;
      logger.log('Resolved homeserver for', pubkey, ':', homeserverStr);
      return homeserverStr;
    } catch (error) {
      logger.error('Failed to resolve homeserver:', error);
      throw error;
    }
  }

  /**
   * Check if signed in
   */
  isSignedIn() {
    return this.session !== null;
  }
}

