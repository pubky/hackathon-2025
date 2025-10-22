/**
 * Background Service
 * Entry point for the extension
 */

import { browser } from '../utils/browserCompat.js';
import { KeyManager } from '../crypto/keyManager.js';
import { HomeserverClient } from '../pubky/homeserverClient.js';
import { BookmarkSync } from '../sync/bookmarkSync.js';
import { StorageManager } from '../storage/storageManager.js';
import { logger } from '../utils/logger.js';

// Global instances
let keyManager;
let homeserverClient;
let bookmarkSync;
let storageManager;

/**
 * Initialize the extension
 */
async function initialize() {
  logger.log('Initializing Booky extension');

  keyManager = new KeyManager();
  homeserverClient = new HomeserverClient();
  bookmarkSync = new BookmarkSync();
  storageManager = new StorageManager();

  // Check if user has completed setup
  const hasSetup = await storageManager.hasCompletedSetup();
  if (hasSetup) {
    // Initialize sync engine
    await bookmarkSync.initialize();

    // Do initial sync on startup
    await bookmarkSync.syncAll();
  }

  logger.log('Booky extension initialized');
}

/**
 * Handle messages from popup
 */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logger.log('Received message:', message);

  // Handle async operations
  handleMessage(message)
    .then(result => {
      logger.log('Sending response:', result);
      sendResponse(result);
    })
    .catch(error => {
      logger.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    });

  // Return true to indicate we'll send response asynchronously
  return true;
});

/**
 * Handle message actions
 */
async function handleMessage(message) {
  switch (message.action) {
    case 'setup':
      await handleSetup(message.homeserver, message.inviteCode);
      return { success: true };

    case 'addMonitoredPubkey':
      await handleAddMonitoredPubkey(message.pubkey);
      return { success: true };

    case 'removeMonitoredPubkey':
      await handleRemoveMonitoredPubkey(message.pubkey);
      return { success: true };

    case 'manualSync':
      await bookmarkSync.syncAll();
      return { success: true };

    case 'getStatus':
      const status = await getStatus();
      return { success: true, data: status };

    case 'exportRecoveryFile':
      const recoveryFile = await keyManager.exportRecoveryFile();
      // Convert Uint8Array to regular array for message passing
      const recoveryFileArray = Array.from(recoveryFile);
      return { success: true, data: recoveryFileArray };

    case 'importRecoveryFile':
      await handleImportRecoveryFile(message.recoveryFileContent, message.homeserver, message.inviteCode);
      return { success: true };

    case 'signOut':
      await handleSignOut();
      return { success: true };

    default:
      return { success: false, error: 'Unknown action' };
  }
}

/**
 * Handle initial setup
 */
async function handleSetup(homeserver, inviteCode) {
  logger.log('Starting setup with homeserver:', homeserver);
  logger.log('Invite code:', inviteCode ? 'provided' : 'none');

  let keypair = null;
  let publicKeyStr = null;
  let secretKey = null;

  try {
    // Generate key (don't store yet)
    const Keypair = (await import('@synonymdev/pubky')).Keypair;
    keypair = Keypair.random();
    publicKeyStr = keypair.publicKey.z32();
    secretKey = keypair.secretKey();

    logger.log('Generated keypair (not stored yet)');

    // Try to sign up with homeserver
    await homeserverClient.initialize();
    await homeserverClient.signup(keypair, homeserver, inviteCode);

    logger.log('Signup successful, now storing key');

    // Only store the key AFTER successful signup
    await keyManager.storeGeneratedKey(publicKeyStr, secretKey);

    // Initialize sync engine
    await bookmarkSync.initialize();

    // Do initial sync
    await bookmarkSync.syncAll();

    logger.log('Setup completed');
  } catch (error) {
    logger.error('Setup failed:', error);
    
    // Don't store the key if signup failed
    logger.log('Key not stored due to signup failure');
    
    // Re-throw to send error to popup
    throw new Error(`Signup failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Handle importing recovery file
 */
async function handleImportRecoveryFile(recoveryFileContent, homeserver, inviteCode) {
  logger.log('Starting import recovery file with homeserver:', homeserver);

  let keypair = null;
  let publicKeyStr = null;
  let secretKey = null;

  try {
    // Convert array back to Uint8Array for the key manager
    const recoveryFileUint8 = new Uint8Array(recoveryFileContent);
    
    // Import key from recovery file (don't store yet)
    const keyData = await keyManager.importRecoveryFile(recoveryFileUint8);
    keypair = keyData.keypair;
    publicKeyStr = keyData.publicKey;
    secretKey = keyData.secretKey;

    logger.log('Imported keypair from recovery file (not stored yet)');

    // Try to sign in with homeserver
    await homeserverClient.initialize();
    await homeserverClient.signin(keypair);

    logger.log('Signin successful, now storing key');

    // Only store the key AFTER successful signin
    await keyManager.storeGeneratedKey(publicKeyStr, secretKey);

    // Initialize sync engine
    await bookmarkSync.initialize();

    // Do initial sync
    await bookmarkSync.syncAll();

    logger.log('Import and setup completed');
  } catch (error) {
    logger.error('Import failed:', error);
    
    // Don't store the key if signin failed
    logger.log('Key not stored due to signin failure');
    
    // Re-throw to send error to popup
    throw new Error(`Signin failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Handle adding a monitored pubkey
 */
async function handleAddMonitoredPubkey(pubkey) {
  logger.log('Adding monitored pubkey:', pubkey);

  // Validate pubkey format (basic check)
  if (!pubkey || pubkey.length < 7) {
    throw new Error('Invalid pubkey format');
  }

  // Add to storage
  await storageManager.addMonitoredPubkey(pubkey);

  // Sync the new folder
  await bookmarkSync.syncFolder(pubkey, false);

  logger.log('Monitored pubkey added:', pubkey);
}

/**
 * Handle removing a monitored pubkey
 */
async function handleRemoveMonitoredPubkey(pubkey) {
  logger.log('Removing monitored pubkey:', pubkey);

  // Delete the bookmark folder for this pubkey
  await bookmarkSync.deleteFolderForPubkey(pubkey);

  // Remove from storage
  await storageManager.removeMonitoredPubkey(pubkey);

  logger.log('Monitored pubkey removed:', pubkey);
}

/**
 * Handle sign out
 */
async function handleSignOut() {
  logger.log('Signing out user');

  try {
    // Clear homeserver session
    if (homeserverClient) {
      homeserverClient.session = null;
      homeserverClient.signer = null;
    }

    // Clear all local storage
    await storageManager.clearAll();

    // Clear cached keypair
    if (keyManager) {
      keyManager.cachedKeypair = null;
    }

    logger.log('Sign out completed');
  } catch (error) {
    logger.error('Error during sign out:', error);
    throw error;
  }
}

/**
 * Get current status
 */
async function getStatus() {
  const hasSetup = await storageManager.hasCompletedSetup();

  if (!hasSetup) {
    return { setup: false };
  }

  const pubkey = await keyManager.getPublicKey();
  const monitored = await storageManager.getMonitoredPubkeys();

  // Get sync status for all folders
  const folders = [pubkey, ...monitored];
  const statuses = {};

  for (const pk of folders) {
    statuses[pk] = await storageManager.getSyncStatus(pk);
  }

  return {
    setup: true,
    pubkey,
    folderName: keyManager.getFolderName(pubkey),
    monitored,
    syncStatuses: statuses
  };
}

// Initialize on startup
initialize().catch(error => {
  logger.error('Failed to initialize:', error);
});

