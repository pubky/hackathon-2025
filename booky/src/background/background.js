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

// Sync interval: 20 seconds for development
const SYNC_INTERVAL_MINUTES = 20 / 60; // 20 seconds as fraction of minute

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

    // Start periodic sync
    startPeriodicSync();

    // Do initial sync
    await bookmarkSync.syncAll();
  }

  logger.log('Booky extension initialized');
}

/**
 * Start periodic sync alarm
 */
function startPeriodicSync() {
  // Create alarm for periodic sync
  browser.alarms.create('periodicSync', {
    periodInMinutes: SYNC_INTERVAL_MINUTES
  });

  // Listen for alarm
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'periodicSync') {
      logger.log('Running periodic sync');
      bookmarkSync.syncAll().catch(error => {
        logger.error('Periodic sync failed:', error);
      });
    }
  });
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
      await handleSetup(message.inviteCode);
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

    default:
      return { success: false, error: 'Unknown action' };
  }
}

/**
 * Handle initial setup
 */
async function handleSetup(inviteCode) {
  logger.log('Starting setup with invite code:', inviteCode ? 'provided' : 'none');

  // Generate key
  const result = await keyManager.generateKey();

  // Sign up with homeserver
  await homeserverClient.initialize();
  await homeserverClient.signup(result.keypair, inviteCode);

  // Initialize sync engine
  await bookmarkSync.initialize();

  // Start periodic sync
  startPeriodicSync();

  // Do initial sync
  await bookmarkSync.syncAll();

  logger.log('Setup completed');
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

  // Remove from storage
  await storageManager.removeMonitoredPubkey(pubkey);

  // Optionally: remove the bookmark folder
  // For now, we'll leave the folder in place

  logger.log('Monitored pubkey removed:', pubkey);
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

