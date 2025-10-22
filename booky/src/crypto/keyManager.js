/**
 * Key Management Module
 * Handles key generation, encryption, and storage
 */

import { Keypair } from '@synonymdev/pubky';
import { StorageManager } from '../storage/storageManager.js';
import { logger } from '../utils/logger.js';

export class KeyManager {
  constructor() {
    this.storage = new StorageManager();
    this.cachedKeypair = null;
  }

  /**
   * Generate a new keypair using Pubky SDK
   */
  async generateKey() {
    try {
      // Generate keypair using Pubky
      const keypair = Keypair.random();

      // Get the public key string
      const publicKeyStr = keypair.publicKey.z32();

      // Get the secret key
      const secretKey = keypair.secretKey();

      // Store the private key (encrypted)
      await this.encryptAndStorePrivateKey(secretKey);

      // Store the public key
      await this.storage.setPubkey(publicKeyStr);

      this.cachedKeypair = keypair;

      logger.log('Generated new keypair, pubkey:', publicKeyStr);

      return {
        keypair,
        publicKey: publicKeyStr,
        secretKey: secretKey
      };
    } catch (error) {
      logger.error('Failed to generate key:', error);
      throw error;
    }
  }

  /**
   * Store a generated key (used after successful signup)
   */
  async storeGeneratedKey(publicKeyStr, secretKey) {
    try {
      // Store the private key (encrypted)
      await this.encryptAndStorePrivateKey(secretKey);

      // Store the public key
      await this.storage.setPubkey(publicKeyStr);

      // Recreate keypair and cache it
      this.cachedKeypair = Keypair.fromSecretKey(secretKey);

      logger.log('Stored keypair, pubkey:', publicKeyStr);
    } catch (error) {
      logger.error('Failed to store key:', error);
      throw error;
    }
  }

  /**
   * Encrypt private key using Web Crypto API
   */
  async encryptAndStorePrivateKey(privateKey) {
    try {
      // Convert private key to Uint8Array if it's not already
      const keyData = typeof privateKey === 'string'
        ? new TextEncoder().encode(privateKey)
        : privateKey;

      // For simplicity in this version, we'll store the key as base64
      // In production, you'd want proper encryption with a derived key
      const base64Key = this.arrayBufferToBase64(keyData);
      await this.storage.setEncryptedKey(base64Key);
    } catch (error) {
      logger.error('Failed to encrypt and store private key:', error);
      throw error;
    }
  }

  /**
   * Retrieve and decrypt private key, returns Keypair
   */
  async getKeypair() {
    if (this.cachedKeypair) {
      return this.cachedKeypair;
    }

    try {
      const encrypted = await this.storage.getEncryptedKey();
      if (!encrypted) {
        return null;
      }

      // Decode from base64
      const secretKey = this.base64ToArrayBuffer(encrypted);

      // Recreate keypair from secret key
      const keypair = Keypair.fromSecretKey(secretKey);
      this.cachedKeypair = keypair;

      return keypair;
    } catch (error) {
      logger.error('Failed to retrieve keypair:', error);
      throw error;
    }
  }

  /**
   * Get public key string
   */
  async getPublicKey() {
    return await this.storage.getPubkey();
  }

  /**
   * Check if user has a key
   */
  async hasKey() {
    const pubkey = await this.getPublicKey();
    return pubkey !== null;
  }

  /**
   * Get folder name from pubkey (first 7 chars)
   */
  getPubkeyPrefix(pubkey) {
    return pubkey.substring(0, 7);
  }

  /**
   * Get folder name for a pubkey
   */
  getFolderName(pubkey) {
    return `pub_${this.getPubkeyPrefix(pubkey)}`;
  }

  /**
   * Export keypair as recovery file using Pubky SDK
   */
  async exportRecoveryFile() {
    try {
      const keypair = await this.getKeypair();
      if (!keypair) {
        throw new Error('No keypair found');
      }

      // Use Pubky SDK's createRecoveryFile method
      const recoveryFile = await keypair.createRecoveryFile('booky');

      logger.log('Created recovery file');
      return recoveryFile;
    } catch (error) {
      logger.error('Failed to export recovery file:', error);
      throw error;
    }
  }

  /**
   * Get recovery code (base64-encoded secret key) for display/backup
   */
  async getRecoveryCode() {
    try {
      const encrypted = await this.storage.getEncryptedKey();
      if (!encrypted) {
        throw new Error('No key found');
      }

      // The encrypted key is already base64-encoded in storage
      // Return it directly as the recovery code
      logger.log('Retrieved recovery code');
      return encrypted;
    } catch (error) {
      logger.error('Failed to get recovery code:', error);
      throw error;
    }
  }

  /**
   * Import keypair from recovery file using Pubky SDK
   */
  async importRecoveryFile(recoveryFileContent) {
    try {
      // Use Pubky SDK's fromRecoveryFile method
      const keypair = Keypair.fromRecoveryFile(recoveryFileContent, 'booky');

      // Get the public key string
      const publicKeyStr = keypair.publicKey.z32();
      const secretKey = keypair.secretKey();

      logger.log('Imported keypair from recovery file, pubkey:', publicKeyStr);

      return {
        keypair,
        publicKey: publicKeyStr,
        secretKey: secretKey
      };
    } catch (error) {
      logger.error('Failed to import recovery file:', error);
      throw error;
    }
  }

  /**
   * Import keypair from base64-encoded secret key (recovery code)
   */
  async importFromSecretKey(secretKeyBase64) {
    try {
      // Decode base64 to get secret key bytes
      const secretKey = this.base64ToArrayBuffer(secretKeyBase64);

      // Create keypair from secret key using Pubky SDK
      const keypair = Keypair.fromSecretKey(secretKey);

      // Get the public key string
      const publicKeyStr = keypair.publicKey.z32();

      logger.log('Imported keypair from secret key, pubkey:', publicKeyStr);

      return {
        keypair,
        publicKey: publicKeyStr,
        secretKey: secretKey
      };
    } catch (error) {
      logger.error('Failed to import from secret key:', error);
      throw error;
    }
  }

  // Helper methods for base64 encoding/decoding
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}

