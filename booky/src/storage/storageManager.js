/**
 * Storage Manager
 * Wrapper around browser storage API
 */

import { browser } from '../utils/browserCompat.js';
import { logger } from '../utils/logger.js';

export class StorageManager {
  constructor() {
    this.storage = browser.storage.local;
  }

  /**
   * Get encrypted private key
   */
  async getEncryptedKey() {
    const result = await this.storage.get('encryptedKey');
    return result.encryptedKey || null;
  }

  /**
   * Store encrypted private key
   */
  async setEncryptedKey(encryptedKey) {
    await this.storage.set({ encryptedKey });
    logger.log('Encrypted key stored');
  }

  /**
   * Get public key
   */
  async getPubkey() {
    const result = await this.storage.get('pubkey');
    return result.pubkey || null;
  }

  /**
   * Store public key
   */
  async setPubkey(pubkey) {
    await this.storage.set({ pubkey });
    logger.log('Pubkey stored:', pubkey);
  }

  /**
   * Get list of monitored pubkeys
   */
  async getMonitoredPubkeys() {
    const result = await this.storage.get('monitoredPubkeys');
    return result.monitoredPubkeys || [];
  }

  /**
   * Add a monitored pubkey
   */
  async addMonitoredPubkey(pubkey) {
    const monitored = await this.getMonitoredPubkeys();
    if (!monitored.includes(pubkey)) {
      monitored.push(pubkey);
      await this.storage.set({ monitoredPubkeys: monitored });
      logger.log('Added monitored pubkey:', pubkey);
    }
  }

  /**
   * Remove a monitored pubkey
   */
  async removeMonitoredPubkey(pubkey) {
    const monitored = await this.getMonitoredPubkeys();
    const filtered = monitored.filter(p => p !== pubkey);
    await this.storage.set({ monitoredPubkeys: filtered });
    logger.log('Removed monitored pubkey:', pubkey);
  }

  /**
   * Get last sync timestamp for a pubkey
   */
  async getLastSync(pubkey) {
    const key = `lastSync_${pubkey}`;
    const result = await this.storage.get(key);
    return result[key] || null;
  }

  /**
   * Set last sync timestamp for a pubkey
   */
  async setLastSync(pubkey, timestamp) {
    const key = `lastSync_${pubkey}`;
    await this.storage.set({ [key]: timestamp });
  }

  /**
   * Get sync status for a pubkey
   */
  async getSyncStatus(pubkey) {
    const key = `syncStatus_${pubkey}`;
    const result = await this.storage.get(key);
    return result[key] || { status: 'pending', error: null };
  }

  /**
   * Set sync status for a pubkey
   */
  async setSyncStatus(pubkey, status, error = null) {
    const key = `syncStatus_${pubkey}`;
    await this.storage.set({ [key]: { status, error, timestamp: Date.now() } });
  }

  /**
   * Check if user has completed setup
   */
  async hasCompletedSetup() {
    const pubkey = await this.getPubkey();
    return pubkey !== null;
  }

  /**
   * Clear all data (for debugging)
   */
  async clearAll() {
    await this.storage.clear();
    logger.log('All storage cleared');
  }
}

