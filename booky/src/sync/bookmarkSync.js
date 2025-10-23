/**
 * Bookmark Sync Engine
 * Handles two-way sync for main folder and read-only sync for monitored folders
 */

import { browser } from '../utils/browserCompat.js';
import { KeyManager } from '../crypto/keyManager.js';
import { HomeserverClient } from '../pubky/homeserverClient.js';
import { StorageManager } from '../storage/storageManager.js';
import { logger } from '../utils/logger.js';

export class BookmarkSync {
  constructor() {
    this.keyManager = new KeyManager();
    this.homeserverClient = new HomeserverClient();
    this.storage = new StorageManager();
    this.syncing = false;
    this.folderCache = new Map(); // Cache bookmark folder IDs
    this.deletingUrls = new Set(); // Track URLs currently being deleted
    this.ignoreEvents = false; // Flag to ignore bookmark events during sync
    this.urlCache = new Map(); // Cache browser ID -> URL mapping
    this.syncTimeout = null; // Debounce timer reference
  }

  /**
   * Initialize the sync engine
   */
  async initialize() {
    try {
      await this.homeserverClient.initialize();

      // Sign in if we have a key
      const keypair = await this.keyManager.getKeypair();
      if (keypair) {
        await this.homeserverClient.signin(keypair);
      }

      // Set up bookmark listeners
      this.setupBookmarkListeners();

      logger.log('Bookmark sync engine initialized');
    } catch (error) {
      logger.error('Failed to initialize sync engine:', error);
      throw error;
    }
  }

  /**
   * Set up listeners for bookmark changes
   */
  setupBookmarkListeners() {
    // Listen for bookmark creation - trigger sync
    browser.bookmarks.onCreated.addListener(async (id, bookmark) => {
      if (this.ignoreEvents) {
        return;
      }

      // Cache the URL for this browser ID
      if (bookmark.url) {
        this.urlCache.set(id, bookmark.url);

        const timestamp = Date.now();
        await this.storage.setBookmarkMeta(bookmark.url, {
          url: bookmark.url,
          timestamp: timestamp
        });
        logger.log('Bookmark created, triggering sync:', bookmark.url);
        this.triggerSyncAfterDelay();
      } else {
        // It's a folder - check if it's inside a synced folder
        const isInSyncedFolder = await this.isInAnySyncedFolder(id);
        if (isInSyncedFolder) {
          logger.log('Folder created in synced folder, triggering sync:', bookmark.title);
          this.triggerSyncAfterDelay();
        }
      }
    });

    // Listen for bookmark changes - trigger sync
    browser.bookmarks.onChanged.addListener(async (id, changeInfo) => {
      if (this.ignoreEvents) {
        return;
      }

      const bookmarks = await browser.bookmarks.get(id);
      if (bookmarks.length > 0 && bookmarks[0].url) {
        const timestamp = Date.now();
        const newUrl = bookmarks[0].url;

        // Handle URL change - get old URL from cache
        if (changeInfo.url) {
          // changeInfo.url is the NEW url, get old from cache
          const oldUrl = this.urlCache.get(id);
          
          if (oldUrl && oldUrl !== newUrl) {
            logger.log('Bookmark URL changed:', oldUrl, '->', newUrl);

            // Mark old URL as deleted
            await this.storage.markDeleted(oldUrl, timestamp);
            await this.storage.removeBookmarkMeta(oldUrl);
          }
        }

        // Update URL cache and metadata for new/current URL
        this.urlCache.set(id, newUrl);
        await this.storage.setBookmarkMeta(newUrl, {
          url: newUrl,
          timestamp: timestamp
        });

        logger.log('Bookmark changed, triggering sync:', newUrl);
        this.triggerSyncAfterDelay();
      }
    });

    // Listen for bookmark removal - trigger sync
    browser.bookmarks.onRemoved.addListener(async (id, removeInfo) => {
      if (this.ignoreEvents) {
        return;
      }

      // Get URL from cache first, fallback to removeInfo
      let url = this.urlCache.get(id);
      if (!url && removeInfo.node && removeInfo.node.url) {
        url = removeInfo.node.url;
      }

      if (url) {
        const timestamp = Date.now();

        // Check if this bookmark was in a synced folder and get its path
        const pubkey = await this.keyManager.getPublicKey();
        if (pubkey) {
          const folderId = this.folderCache.get(pubkey);
          if (folderId && removeInfo.parentId) {
            // Check if the parent was in our synced folder
            const isParentSyncedFolder = removeInfo.parentId === folderId;
            const wasInSyncedFolder = isParentSyncedFolder || await this.isInFolder(removeInfo.parentId, folderId);

            if (wasInSyncedFolder) {
              // Get the path for this bookmark
              const path = isParentSyncedFolder ? '' : await this.getPathInFolder(removeInfo.parentId, folderId);
              if (path !== null) {
                logger.log('Bookmark removed from synced folder:', url, 'path:', path);

                // Mark as deleted with path
                await this.storage.markDeleted(url, timestamp, path);
                await this.storage.removeBookmarkMeta(url);

                // Delete from homeserver immediately
                await this.deleteBookmarkWithPath(url, path);

                // Remove from cache
                this.urlCache.delete(id);

                logger.log('Bookmark removed, triggering sync:', url);
                this.triggerSyncAfterDelay();
                return;
              }
            }
          }
        }

        // Fallback: not in synced folder or couldn't determine path
        await this.storage.markDeleted(url, timestamp);
        await this.storage.removeBookmarkMeta(url);

        // Remove from cache
        this.urlCache.delete(id);

        logger.log('Bookmark removed, triggering sync:', url);
        this.triggerSyncAfterDelay();
      } else if (removeInfo.node && !removeInfo.node.url) {
        // It's a folder that was removed - check if it was in a synced folder
        const pubkey = await this.keyManager.getPublicKey();
        if (pubkey) {
          const folderId = this.folderCache.get(pubkey);
          if (folderId && removeInfo.parentId) {
            // Check if the parent is the synced folder or inside it
            const isParentSyncedFolder = removeInfo.parentId === folderId;
            const wasInSyncedFolder = isParentSyncedFolder || await this.isInFolder(removeInfo.parentId, folderId);

            if (wasInSyncedFolder) {
              // Get the path for the removed folder
              const parentPath = isParentSyncedFolder ? '' : await this.getPathInFolder(removeInfo.parentId, folderId);
              if (parentPath !== null) {
                const folderPath = parentPath ? `${parentPath}${removeInfo.node.title}/` : `${removeInfo.node.title}/`;
                logger.log('Folder removed from synced folder, deleting from homeserver:', removeInfo.node.title, 'path:', folderPath);

                const timestamp = Date.now();

                // Mark all bookmarks in this folder tree as deleted
                if (removeInfo.node.children) {
                  await this.markFolderContentsDeleted(removeInfo.node.children, timestamp, folderPath);
                }

                // Delete the folder (and its contents) from homeserver - await this!
                await this.deleteFolderFromHomeserver(folderPath);

                logger.log('Folder removed, triggering sync:', removeInfo.node.title);
                this.triggerSyncAfterDelay();
                return;
              }
            }
          }
        }
        logger.log('Folder removed (not in synced folder):', removeInfo.node.title);
      }
    });

    // Listen for bookmark moves - trigger sync
    browser.bookmarks.onMoved.addListener(async (id, moveInfo) => {
      if (this.ignoreEvents) {
        return;
      }

      // Get the bookmark to check if it has a URL (is not a folder)
      const bookmarks = await browser.bookmarks.get(id);
      if (bookmarks.length > 0 && bookmarks[0].url) {
        const url = bookmarks[0].url;

        // Update URL cache
        this.urlCache.set(id, url);

        // Check if moved into or out of our synced folders
        const pubkey = await this.keyManager.getPublicKey();
        const monitored = await this.storage.getMonitoredPubkeys();
        const allPubkeys = pubkey ? [pubkey, ...monitored] : monitored;

        // Find which synced folder this bookmark is in (if any)
        let syncedFolderId = null;
        for (const pk of allPubkeys) {
          const folderId = this.folderCache.get(pk);
          if (folderId && await this.isInFolder(id, folderId)) {
            syncedFolderId = folderId;
            break;
          }
        }

        if (syncedFolderId) {
          // Bookmark is in a synced folder
          // Get the old and new paths within the synced folder
          const oldPath = await this.getPathInFolder(moveInfo.oldParentId, syncedFolderId);
          const newPath = await this.getPathInFolder(moveInfo.parentId, syncedFolderId);

          const timestamp = Date.now();

          if (oldPath !== newPath) {
            // Path changed - need to delete from old location and add to new
            logger.log('Bookmark moved within synced folder:', url, 'from path "' + oldPath + '" to "' + newPath + '"');

            // Mark old path as deleted (tombstone) so sync knows to ignore it
            if (oldPath !== null) {
              await this.storage.markDeleted(url, timestamp, oldPath);

              // Also delete from homeserver immediately (don't wait for sync)
              await this.deleteBookmarkWithPath(url, oldPath);
            }
          }

          // Update metadata with new timestamp
          await this.storage.setBookmarkMeta(url, {
            url: url,
            timestamp: timestamp
          });

          logger.log('Bookmark moved, triggering sync:', url);
          this.triggerSyncAfterDelay();
        } else {
          // Moved out of synced folder - treat as deletion
          const timestamp = Date.now();
          await this.storage.markDeleted(url, timestamp);
          await this.storage.removeBookmarkMeta(url);

          // Delete from homeserver immediately (don't wait for sync)
          await this.deleteBookmarkByUrl(url);

          logger.log('Bookmark moved out of synced folder, triggering sync:', url);
          this.triggerSyncAfterDelay();
        }
      }
    });
  }

  /**
   * Tear down listeners and clear caches to avoid leakage across users
   */
  async destroy() {
    try {
      // Prevent any further reactions from this instance
      this.ignoreEvents = true;

      // Clear any pending sync timers
      if (this.syncTimeout) {
        clearTimeout(this.syncTimeout);
        this.syncTimeout = null;
      }

      // Clear internal caches
      if (this.folderCache) this.folderCache.clear();
      if (this.urlCache) this.urlCache.clear();
      if (this.deletingUrls) this.deletingUrls.clear();

      // Invalidate any cached keypair in this instance's key manager
      if (this.keyManager && this.keyManager.cachedKeypair) {
        this.keyManager.cachedKeypair = null;
      }

      // Clear homeserver session for this instance
      if (this.homeserverClient) {
        this.homeserverClient.session = null;
        this.homeserverClient.signer = null;
      }
    } catch (error) {
      logger.warn('Failed to destroy BookmarkSync cleanly:', error);
    }
  }

  /**
   * Trigger sync after a short delay to batch operations
   */
  triggerSyncAfterDelay() {
    // Clear any existing timeout
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    
    // Schedule sync after 500ms (batches rapid changes)
    this.syncTimeout = setTimeout(() => {
      logger.log('Triggering sync after user action');
      this.syncAll().catch(error => {
        logger.error('Sync failed:', error);
      });
    }, 500);
  }


  /**
   * Check if bookmark is in a specific folder
   */
  async isInFolder(bookmarkId, folderId) {
    try {
      const bookmark = await browser.bookmarks.get(bookmarkId);
      if (bookmark.length === 0) return false;

      let current = bookmark[0];
      while (current.parentId) {
        if (current.parentId === folderId) return true;
        const parent = await browser.bookmarks.get(current.parentId);
        if (parent.length === 0) break;
        current = parent[0];
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if bookmark/folder is in any synced folder
   */
  async isInAnySyncedFolder(bookmarkId) {
    try {
      const pubkey = await this.keyManager.getPublicKey();
      const monitored = await this.storage.getMonitoredPubkeys();
      const allPubkeys = pubkey ? [pubkey, ...monitored] : monitored;

      for (const pk of allPubkeys) {
        const folderId = this.folderCache.get(pk);
        if (folderId && await this.isInFolder(bookmarkId, folderId)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the relative path from a folder ID to the synced root folder
   * @param {string} folderId - The folder ID to get path for
   * @param {string} rootFolderId - The synced root folder ID
   * @returns {string|null} - Relative path like "tag1/tag2/" or "" for root, null if not in root
   */
  async getPathInFolder(folderId, rootFolderId) {
    try {
      // If the folder is the root itself, return empty string
      if (folderId === rootFolderId) {
        return '';
      }

      // Build path by walking up the tree
      const pathSegments = [];
      let currentId = folderId;

      while (currentId && currentId !== rootFolderId) {
        const nodes = await browser.bookmarks.get(currentId);
        if (nodes.length === 0) {
          return null; // Folder doesn't exist
        }

        const node = nodes[0];
        if (!node.parentId) {
          return null; // Reached root without finding synced folder
        }

        // Add this folder's title to path
        pathSegments.unshift(node.title);
        currentId = node.parentId;
      }

      // Check if we found the root folder
      if (currentId === rootFolderId) {
        return pathSegments.length > 0 ? pathSegments.join('/') + '/' : '';
      }

      return null; // Not in this synced folder
    } catch (error) {
      logger.warn('Error getting path in folder:', error);
      return null;
    }
  }

  /**
   * Get or create bookmark folder for a pubkey
   */
  async getOrCreateFolder(pubkey, isOwnFolder = false) {
    const folderName = this.keyManager.getFolderName(pubkey);

    // Check cache first
    if (this.folderCache.has(pubkey)) {
      return this.folderCache.get(pubkey);
    }

    try {
      // Search for existing folder
      const results = await browser.bookmarks.search({ title: folderName });
      for (const result of results) {
        if (result.title === folderName && !result.url) {
          this.folderCache.set(pubkey, result.id);

          // If this is the user's own folder, ensure priv and priv_sharing subfolders exist
          if (isOwnFolder) {
            await this.ensurePrivFolder(result.id);
            await this.ensurePrivSharingFolder(result.id);
          }

          return result.id;
        }
      }

      // Create new folder in bookmarks bar
      const bookmarkBar = await this.getBookmarksBar();
      const folder = await browser.bookmarks.create({
        parentId: bookmarkBar,
        title: folderName
      });

      this.folderCache.set(pubkey, folder.id);
      logger.log('Created folder:', folderName);

      // If this is the user's own folder, create priv and priv_sharing subfolders
      if (isOwnFolder) {
        await this.ensurePrivFolder(folder.id);
        await this.ensurePrivSharingFolder(folder.id);
      }

      return folder.id;
    } catch (error) {
      logger.error('Failed to get/create folder:', error);
      throw error;
    }
  }

  /**
   * Ensure priv subfolder exists for user's own folder
   */
  async ensurePrivFolder(parentFolderId) {
    try {
      // Check if priv folder already exists
      const children = await browser.bookmarks.getChildren(parentFolderId);
      for (const child of children) {
        if (!child.url && child.title === 'priv') {
          logger.log('Priv folder already exists');
          return child.id;
        }
      }

      // Create priv subfolder
      const privFolder = await browser.bookmarks.create({
        parentId: parentFolderId,
        title: 'priv'
      });

      logger.log('Created priv subfolder:', privFolder.id);
      return privFolder.id;
    } catch (error) {
      logger.error('Failed to ensure priv folder:', error);
      throw error;
    }
  }

  /**
   * Ensure priv_sharing subfolder exists for user's own folder
   */
  async ensurePrivSharingFolder(parentFolderId) {
    try {
      // Check if priv_sharing folder already exists
      const children = await browser.bookmarks.getChildren(parentFolderId);
      for (const child of children) {
        if (!child.url && child.title === 'priv_sharing') {
          logger.log('Priv_sharing folder already exists');
          return child.id;
        }
      }

      // Create priv_sharing subfolder
      const privSharingFolder = await browser.bookmarks.create({
        parentId: parentFolderId,
        title: 'priv_sharing'
      });

      logger.log('Created priv_sharing subfolder:', privSharingFolder.id);
      return privSharingFolder.id;
    } catch (error) {
      logger.error('Failed to ensure priv_sharing folder:', error);
      throw error;
    }
  }

  /**
   * Ensure groups folder exists in bookmarks bar
   */
  async ensureGroupsFolder() {
    try {
      const bookmarkBar = await this.getBookmarksBar();

      // Check if groups folder already exists
      const children = await browser.bookmarks.getChildren(bookmarkBar);
      for (const child of children) {
        if (!child.url && child.title === 'groups') {
          logger.log('Groups folder already exists');
          return child.id;
        }
      }

      // Create groups folder
      const groupsFolder = await browser.bookmarks.create({
        parentId: bookmarkBar,
        title: 'groups'
      });

      logger.log('Created groups folder:', groupsFolder.id);
      return groupsFolder.id;
    } catch (error) {
      logger.error('Failed to ensure groups folder:', error);
      throw error;
    }
  }

  /**
   * Create a sharing folder in priv_sharing for a monitored pubkey
   * This creates a folder in the current user's priv_sharing directory
   * named after the monitored key, so bookmarks can be shared with them
   */
  async createPrivSharingFolder(monitoredPubkey) {
    try {
      // Get the user's own pubkey and folder
      const ownPubkey = await this.keyManager.getPublicKey();

      // Get or create the user's main folder
      const mainFolderId = await this.getOrCreateFolder(ownPubkey, true);
      if (!mainFolderId) {
        throw new Error('User main folder not found');
      }

      // Ensure priv_sharing folder exists in user's main folder
      const privSharingFolderId = await this.ensurePrivSharingFolder(mainFolderId);

      // Create folder named after the MONITORED key (the key we're sharing WITH)
      const monitoredFolderName = this.keyManager.getFolderName(monitoredPubkey);

      // Check if folder already exists
      const children = await browser.bookmarks.getChildren(privSharingFolderId);
      for (const child of children) {
        if (!child.url && child.title === monitoredFolderName) {
          logger.log('Sharing folder already exists for:', monitoredFolderName);
          return child.id;
        }
      }

      // Create the folder for sharing with the monitored key
      const sharingFolder = await browser.bookmarks.create({
        parentId: privSharingFolderId,
        title: monitoredFolderName
      });

      logger.log('Created sharing folder:', monitoredFolderName, 'in current user\'s priv_sharing for sharing with:', monitoredPubkey);
      return sharingFolder.id;
    } catch (error) {
      logger.error('Failed to create sharing folder:', error);
      throw error;
    }
  }

  /**
   * Get bookmarks bar ID
   */
  async getBookmarksBar() {
    const tree = await browser.bookmarks.getTree();
    // Chrome: id '1' is bookmarks bar, Firefox: find by title
    if (tree[0].children) {
      for (const child of tree[0].children) {
        if (child.title === 'Bookmarks Bar' || child.title === 'Bookmarks Toolbar' || child.id === '1') {
          return child.id;
        }
      }
    }
    return '1'; // Default to bookmarks bar
  }

  /**
   * Sync all folders
   */
  async syncAll() {
    if (this.syncing) {
      logger.log('Sync already in progress, skipping');
      return;
    }

    this.syncing = true;
    this.ignoreEvents = true; // Disable event listeners during sync

    try {
      // Sync main folder
      const pubkey = await this.keyManager.getPublicKey();
      if (pubkey) {
        await this.syncFolder(pubkey, true);
      }

      // Sync monitored folders
      const monitored = await this.storage.getMonitoredPubkeys();
      for (const monitoredPubkey of monitored) {
        await this.syncFolder(monitoredPubkey, false);
      }

      // Sync groups folders - merge bookmarks from matching folder names
      await this.syncGroupsFolders();
    } finally {
      this.syncing = false;
      this.ignoreEvents = false; // Re-enable event listeners
    }
  }

  /**
   * Sync a specific folder
   */
  async syncFolder(pubkey, isTwoWay = false) {
    try {
      await this.storage.setSyncStatus(pubkey, 'syncing');

      const folderId = await this.getOrCreateFolder(pubkey, isTwoWay);

      // Get local bookmarks
      const localBookmarks = await this.getBookmarksInFolder(folderId);

      // Get remote bookmarks
      const remoteBookmarks = await this.fetchRemoteBookmarks(pubkey, isTwoWay);

      // Sync all bookmarks (including shared ones) to the user's folder
      if (isTwoWay) {
        // Two-way sync: merge both directions
        await this.mergeTwoWay(folderId, localBookmarks, remoteBookmarks, pubkey);
      } else {
        // Read-only sync: only update local from remote
        await this.mergeReadOnly(folderId, localBookmarks, remoteBookmarks);
      }

      // Remove any duplicates (same URL)
      await this.removeDuplicates(folderId);

      await this.storage.setLastSync(pubkey, Date.now());
      await this.storage.setSyncStatus(pubkey, 'synced');

      logger.log('Synced folder for', pubkey);
    } catch (error) {
      logger.error('Failed to sync folder:', error);
      await this.storage.setSyncStatus(pubkey, 'error', error.message);
      throw error;
    }
  }

  /**
   * Get all bookmarks in a folder
   */
  async getBookmarksInFolder(folderId) {
    const folder = await browser.bookmarks.getSubTree(folderId);
    const bookmarks = [];
    const bookmarkMeta = await this.storage.getAllBookmarkMeta();

    const traverse = (node, path = '') => {
      if (node.url) {
        // Cache the browser ID -> URL mapping
        this.urlCache.set(node.id, node.url);

        // Use our stored timestamp if available (keyed by URL)
        const meta = bookmarkMeta[node.url];
        const timestamp = meta ? meta.timestamp : (node.dateAdded || Date.now());

        bookmarks.push({
          id: node.id, // Browser ID (only used for browser API calls)
          url: node.url, // Unique identifier for syncing
          title: node.title || '',
          timestamp: timestamp,
          path: path // Relative path from synced folder root (empty for root, or "tag/" for subfolder)
        });
      }
      if (node.children) {
        // Process children, passing down the path
        node.children.forEach(child => {
          // If child is a folder, append its title to the path
          const childPath = child.url ? path : (path ? `${path}${child.title}/` : `${child.title}/`);
          traverse(child, childPath);
        });
      }
    };

    if (folder.length > 0) {
      traverse(folder[0], '');
    }

    return bookmarks;
  }

  /**
   * Fetch remote bookmarks from homeserver
   */
  async fetchRemoteBookmarks(pubkey, isOwnData) {
    try {
      if (isOwnData) {
        // Use session storage for own data (absolute path)
        // Fetch from public, private, and priv_sharing folders
        const basePath = '/pub/booky/';
        logger.log('Fetching own bookmarks from:', basePath);

        const bookmarks = [];

        // Fetch public bookmarks (root and subfolders, excluding priv/ and priv_sharing/)
        await this.fetchBookmarksRecursive(basePath, '', bookmarks, false, null);

        // Fetch private bookmarks from priv/ folder
        logger.log('Fetching private bookmarks from:', basePath + 'priv/');
        await this.fetchBookmarksRecursive(basePath, 'priv/', bookmarks, false, null);

        // Fetch shared bookmarks from priv_sharing/ folder (all subdirectories)
        logger.log('Fetching shared bookmarks from:', basePath + 'priv_sharing/');
        await this.fetchBookmarksRecursive(basePath, 'priv_sharing/', bookmarks, false, null);

        logger.log('Successfully fetched', bookmarks.length, 'bookmarks for own data (public + private + shared)');
        return bookmarks;
      } else {
        // Use public storage for other users (addressed path)
        // Fetch public bookmarks and bookmarks they're sharing with us
        const baseAddress = `pubky://${pubkey}/pub/booky/`;
        logger.log('Fetching public bookmarks for:', pubkey);

        const bookmarks = [];

        // Fetch public bookmarks (root and subfolders, excluding priv/ and priv_sharing/)
        await this.fetchBookmarksRecursive(baseAddress, '', bookmarks, true, pubkey);

        // Fetch bookmarks they're sharing with us from priv_sharing/{our_pubkey}/ folder
        // Store them in a separate top-level shared/ folder
        const ourPubkey = await this.keyManager.getPublicKey();
        if (ourPubkey) {
          const ourFolderName = this.keyManager.getFolderName(ourPubkey);
          const sharedPath = `priv_sharing/${ourFolderName}/`;
          logger.log('Fetching shared bookmarks from:', baseAddress + sharedPath);

          try {
            const sharedBookmarks = [];
            await this.fetchBookmarksRecursive(baseAddress, sharedPath, sharedBookmarks, true, pubkey);

            // Keep the bookmarks with their priv_sharing path - they'll be stored in the monitored user's folder
            // Path will be like: priv_sharing/pub_abcd/ (or priv_sharing/pub_abcd/subfolder/)
            for (const bookmark of sharedBookmarks) {
              logger.log('Shared bookmark path:', bookmark.path, 'for URL:', bookmark.url);
              bookmarks.push(bookmark);
            }

            logger.log('Successfully fetched', sharedBookmarks.length, 'shared bookmarks');
          } catch (error) {
            logger.log('No shared bookmarks or error fetching:', error.message);
            // Continue even if there are no shared bookmarks
          }
        }

        logger.log('Successfully fetched', bookmarks.length, 'total bookmarks for', pubkey);
        return bookmarks;
      }
    } catch (error) {
      // If list fails, log detailed error but return empty array
      logger.error('Failed to fetch remote bookmarks for', pubkey, ':', error);
      logger.error('Error details:', error.message, error.stack);
      return [];
    }
  }

  /**
   * Recursively fetch bookmarks from a path, including subdirectories
   */
  async fetchBookmarksRecursive(basePath, relativePath, bookmarks, isPublic, pubkey) {
    try {
      const currentPath = `${basePath}${relativePath}`;
      let entries;

      if (isPublic) {
        entries = await this.homeserverClient.listPublic(currentPath);
      } else {
        entries = await this.homeserverClient.list(currentPath);
      }

      if (!entries) {
        logger.warn('List returned null/undefined for path:', currentPath);
        return;
      }

      logger.log('Processing', entries.length, 'entries from path:', currentPath);

      // Normalize basePath to remove pubky:// protocol for comparison
      let normalizedBasePath = basePath;
      if (basePath.startsWith('pubky://')) {
        const parts = basePath.split('/');
        const pubkeyIndex = parts.findIndex(p => p && p.length > 20);
        if (pubkeyIndex >= 0) {
          normalizedBasePath = '/' + parts.slice(pubkeyIndex + 1).join('/');
        }
      }

      for (const entry of entries) {
        try {
          // Entry format: pubky://<pubkey>/pub/booky/[path/]filename
          // We need to extract the part after basePath

          // Remove the protocol and pubkey to get just the path
          let entryPath = entry;
          if (entry.startsWith('pubky://')) {
            // Extract path after the pubkey: pubky://<pubkey>/pub/booky/... -> /pub/booky/...
            const parts = entry.split('/');
            const pubkeyIndex = parts.findIndex(p => p && p.length > 20); // Find the pubkey part
            if (pubkeyIndex >= 0) {
              entryPath = '/' + parts.slice(pubkeyIndex + 1).join('/');
            }
          }

          // Check if this is a directory (ends with /)
          if (entry.endsWith('/')) {
            // It's a directory
            // Extract the relative path from normalized basePath
            const relPath = entryPath.substring(normalizedBasePath.length);

            // Skip priv/ and priv_sharing/ folders when fetching public bookmarks for other users
            // (priv_sharing is fetched separately with our specific pubkey path)
            if (isPublic && (relPath === 'priv/' || relPath === 'priv_sharing/')) {
              logger.log('Skipping', relPath, 'folder for monitored user');
              continue;
            }

            // Recurse into it
            await this.fetchBookmarksRecursive(basePath, relPath, bookmarks, isPublic, pubkey);
          } else {
            // It's a file - extract relative path from normalized basePath
            const fullRelativePath = entryPath.substring(normalizedBasePath.length);
            const pathParts = fullRelativePath.split('/');
            const filename = pathParts.pop(); // Last part is filename
            const filePath = pathParts.length > 0 ? pathParts.join('/') + '/' : ''; // Remaining is path

            logger.log('Bookmark file path calculation - entryPath:', entryPath, 'normalizedBasePath:', normalizedBasePath, 'fullRelativePath:', fullRelativePath, 'filePath:', filePath);

            // Fetch the bookmark data using the entry directly
            let data;
            if (isPublic) {
              data = await this.homeserverClient.getPublic(entry);
            } else {
              data = await this.homeserverClient.get(entryPath);
            }

            // Add path information to bookmark
            data.path = filePath;
            bookmarks.push(data);
          }
        } catch (error) {
          // 404 errors are expected for recently deleted files (list might be stale)
          if (error.message && error.message.includes('404')) {
            logger.log('Bookmark entry not found (likely recently deleted):', entry);
          } else {
            logger.warn('Failed to fetch entry:', entry, error);
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to list path:', basePath + relativePath, error);
      // Don't throw - just skip this directory
    }
  }

  /**
   * Two-way merge: sync changes in both directions based on timestamps
   */
  async mergeTwoWay(folderId, localBookmarks, remoteBookmarks, pubkey) {
    // Use URL+path as composite key for matching
    const makeKey = (b) => `${b.url}||${b.path || ''}`;
    const localMap = new Map(localBookmarks.map(b => [makeKey(b), b]));
    const remoteMap = new Map(remoteBookmarks.map(b => [makeKey(b), b]));

    // Track folders we need to create
    const folderCache = new Map(); // path -> browser folder ID

    // PHASE 1: Process deletions FIRST (tombstones take priority)
    for (const remote of remoteBookmarks) {
      const local = localMap.get(makeKey(remote));
      // Check if this specific URL+path combo was deleted
      const deletedInfo = await this.storage.isDeleted(remote.url, remote.path);

      if (!local && deletedInfo) {
        // We deleted this URL at this path locally - delete from remote
        logger.log('Deleting from remote (tombstone):', remote.url, 'path:', remote.path);
        await this.deleteBookmarkWithPath(remote.url, remote.path);

        // Clear the tombstone for this specific path since we've handled it
        await this.storage.clearDeleted(remote.url, remote.path);
      }
    }

    // PHASE 2: Push local bookmarks (new or updated)
    for (const local of localBookmarks) {
      const remote = remoteMap.get(makeKey(local));
      if (!remote) {
        // Exists locally but not remotely - push to remote
        logger.log('Pushing to remote (new):', local.url, 'path:', local.path);
        await this.pushBookmark(local);
      } else if (local.timestamp > remote.timestamp) {
        // Local is newer - update remote
        logger.log('Pushing to remote (newer):', local.url, 'path:', local.path);
        await this.pushBookmark(local);
      }
    }

    // PHASE 3: Pull remote bookmarks (new or updated)
    for (const remote of remoteBookmarks) {
      const local = localMap.get(makeKey(remote));
      // Check if this specific URL+path was deleted
      const deletedInfo = await this.storage.isDeleted(remote.url, remote.path);

      // Skip if we deleted this specific URL+path combination
      if (deletedInfo) {
        logger.log('Skipping remote bookmark (locally deleted):', remote.url, 'path:', remote.path);
        continue;
      }

      if (!local) {
        // Doesn't exist locally and not deleted - pull from remote
        logger.log('Pulling from remote (new):', remote.url, 'path:', remote.path);

        // Get or create parent folder for this path
        const parentId = await this.getOrCreateSubfolder(folderId, remote.path, folderCache);

        await browser.bookmarks.create({
          parentId: parentId,
          title: remote.title,
          url: remote.url
        });

        // Store metadata
        await this.storage.setBookmarkMeta(remote.url, {
          url: remote.url,
          timestamp: remote.timestamp
        });
      } else if (remote.timestamp > local.timestamp) {
        // Remote is newer - update local
        logger.log('Updating from remote (newer):', remote.url, 'path:', remote.path);
        await browser.bookmarks.update(local.id, {
          title: remote.title,
          url: remote.url
        });

        // Update metadata
        await this.storage.setBookmarkMeta(remote.url, {
          url: remote.url,
          timestamp: remote.timestamp
        });
      }
    }
  }

  /**
   * Read-only merge: only update local from remote
   */
  async mergeReadOnly(folderId, localBookmarks, remoteBookmarks) {
    // Use URL+path as composite key
    const makeKey = (b) => `${b.url}||${b.path || ''}`;
    const localMap = new Map(localBookmarks.map(b => [makeKey(b), b]));

    // Track folders we need to create
    const folderCache = new Map(); // path -> browser folder ID

    // Add or update bookmarks from remote
    for (const remote of remoteBookmarks) {
      const local = localMap.get(makeKey(remote));
      if (!local) {
        // Create new bookmark in correct folder
        logger.log('Creating bookmark with path:', remote.path, 'URL:', remote.url);
        const parentId = await this.getOrCreateSubfolder(folderId, remote.path, folderCache);
        await browser.bookmarks.create({
          parentId: parentId,
          title: remote.title,
          url: remote.url
        });
      } else if (remote.timestamp > local.timestamp) {
        // Update existing bookmark
        await browser.bookmarks.update(local.id, {
          title: remote.title,
          url: remote.url
        });
      }
    }

    // Remove local bookmarks that don't exist remotely
    const remoteKeys = new Set(remoteBookmarks.map(b => makeKey(b)));
    for (const local of localBookmarks) {
      if (!remoteKeys.has(makeKey(local))) {
        await browser.bookmarks.remove(local.id);
      }
    }
  }

  /**
   * Push a bookmark to homeserver
   */
  async pushBookmark(bookmark) {
    try {
      const data = {
        url: bookmark.url,
        title: bookmark.title,
        tags: [],
        timestamp: bookmark.timestamp || Date.now()
      };

      // Create a safe filename from URL (URL is the unique identifier)
      const filename = await this.createFilename(bookmark.url);

      // Build path with folder structure: /pub/booky/[{path}]{filename}
      // path will be empty string for root, or "tag/" for subfolder
      const path = bookmark.path || '';
      const fullPath = `/pub/booky/${path}${filename}`;

      // Use session storage with absolute path
      await this.homeserverClient.put(fullPath, data);

      logger.log('Pushed bookmark:', bookmark.url, 'to path:', fullPath);
    } catch (error) {
      logger.error('Failed to push bookmark:', error);
      throw error;
    }
  }

  /**
   * Delete a bookmark from homeserver
   */
  async deleteBookmark(bookmark, timestamp = Date.now()) {
    try {
      const filename = await this.createFilename(bookmark.url);
      const relativePath = bookmark.path || '';
      const fullPath = `/pub/booky/${relativePath}${filename}`;

      // Delete from homeserver (use DELETE method via session.storage)
      await this.homeserverClient.delete(fullPath);

      logger.log('Deleted bookmark from homeserver:', bookmark.url, 'at path:', fullPath);
    } catch (error) {
      logger.warn('Failed to delete bookmark from homeserver:', error);
      // Don't throw - deletion might fail if it doesn't exist
    }
  }

  /**
   * Delete a bookmark by URL - searches all paths
   */
  async deleteBookmarkByUrl(url, path = null) {
    try {
      if (path !== null) {
        // If path is provided, use it directly
        await this.deleteBookmarkWithPath(url, path);
      } else {
        // Search for the bookmark in all possible locations
        // Try root first
        const filename = await this.createFilename(url);

        // List all entries recursively and find matching filename
        const basePath = '/pub/booky/';
        const deleted = await this.deleteBookmarkRecursive(basePath, '', filename, url);

        if (deleted) {
          logger.log('Deleted bookmark by URL:', url);
        } else {
          logger.warn('Bookmark not found for deletion:', url);
        }
      }
    } catch (error) {
      logger.warn('Failed to delete bookmark by URL:', error);
    }
  }

  /**
   * Recursively search and delete a bookmark file
   */
  async deleteBookmarkRecursive(basePath, relativePath, filename, url) {
    try {
      const currentPath = `${basePath}${relativePath}`;
      const entries = await this.homeserverClient.list(currentPath);

      for (const entry of entries) {
        const entryName = entry.split('/').filter(s => s).pop();

        if (entry.endsWith('/')) {
          // Directory - recurse
          const newRelativePath = relativePath ? `${relativePath}${entryName}/` : `${entryName}/`;
          const found = await this.deleteBookmarkRecursive(basePath, newRelativePath, filename, url);
          if (found) return true;
        } else if (entryName === filename) {
          // Found it - delete
          const fullPath = `${currentPath}${filename}`;
          await this.homeserverClient.delete(fullPath);
          logger.log('Deleted bookmark at:', fullPath);
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.warn('Error during recursive delete at path:', basePath + relativePath, error);
      return false;
    }
  }

  /**
   * Remove duplicate bookmarks (same URL + path) from a folder
   */
  async removeDuplicates(folderId) {
    try {
      const bookmarks = await this.getBookmarksInFolder(folderId);
      const makeKey = (b) => `${b.url}||${b.path || ''}`;
      const bookmarkMap = new Map();
      const duplicates = [];

      // Find duplicates - same URL AND path
      for (const bookmark of bookmarks) {
        const key = makeKey(bookmark);
        if (bookmarkMap.has(key)) {
          // Duplicate found (same URL at same path)
          const existing = bookmarkMap.get(key);

          // Keep the one with newer timestamp, remove the other
          if (bookmark.timestamp > existing.timestamp) {
            duplicates.push(existing.id);
            bookmarkMap.set(key, bookmark);
          } else {
            duplicates.push(bookmark.id);
          }
        } else {
          bookmarkMap.set(key, bookmark);
        }
      }

      // Remove duplicates
      if (duplicates.length > 0) {
        logger.log(`Found ${duplicates.length} duplicate(s), removing...`);
        for (const id of duplicates) {
          await browser.bookmarks.remove(id);
        }
        logger.log('Duplicates removed');
      }
    } catch (error) {
      logger.warn('Failed to remove duplicates:', error);
      // Don't throw - this is a cleanup operation
    }
  }

  /**
   * Delete bookmark folder for a pubkey
   */
  async deleteFolderForPubkey(pubkey) {
    try {
      // Check if folder exists in cache
      const folderId = this.folderCache.get(pubkey);

      if (folderId) {
        // Remove folder from browser bookmarks
        await browser.bookmarks.removeTree(folderId);
        logger.log('Deleted folder for pubkey:', pubkey);
      } else {
        // Try to find folder by name if not in cache
        const folderName = this.keyManager.getFolderName(pubkey);
        const results = await browser.bookmarks.search({ title: folderName });

        for (const result of results) {
          if (result.title === folderName && !result.url) {
            await browser.bookmarks.removeTree(result.id);
            logger.log('Deleted folder for pubkey:', pubkey);
            break;
          }
        }
      }

      // Remove from cache
      this.folderCache.delete(pubkey);
    } catch (error) {
      logger.warn('Failed to delete folder for pubkey:', pubkey, error);
      // Don't throw - folder might not exist or already be deleted
    }
  }

  /**
   * Get or create a subfolder within a parent folder based on path
   * @param {string} parentId - Browser bookmark folder ID of parent
   * @param {string} path - Relative path like "tag1/" or "tag1/tag2/" or ""
   * @param {Map} folderCache - Cache of path -> folder ID
   * @returns {string} - Browser bookmark folder ID to use as parent
   */
  async getOrCreateSubfolder(parentId, path, folderCache) {
    if (!path || path === '') {
      return parentId;
    }

    // Check cache first
    if (folderCache.has(path)) {
      return folderCache.get(path);
    }

    // Split path into segments (e.g., "tag1/tag2/" -> ["tag1", "tag2"])
    const segments = path.split('/').filter(s => s);
    let currentParent = parentId;
    let currentPath = '';

    for (const segment of segments) {
      currentPath += segment + '/';

      // Check if we have this path cached
      if (folderCache.has(currentPath)) {
        currentParent = folderCache.get(currentPath);
        continue;
      }

      // Search for existing folder with this name under current parent
      const children = await browser.bookmarks.getChildren(currentParent);
      let found = null;

      for (const child of children) {
        if (!child.url && child.title === segment) {
          found = child.id;
          break;
        }
      }

      if (found) {
        currentParent = found;
      } else {
        // Create the folder
        const newFolder = await browser.bookmarks.create({
          parentId: currentParent,
          title: segment
        });
        currentParent = newFolder.id;
        logger.log('Created subfolder:', segment, 'at path:', currentPath);
      }

      // Cache this path
      folderCache.set(currentPath, currentParent);
    }

    return currentParent;
  }

  /**
   * Delete a bookmark from homeserver with specific path
   */
  async deleteBookmarkWithPath(url, path) {
    try {
      const filename = await this.createFilename(url);
      const relativePath = path || '';
      const fullPath = `/pub/booky/${relativePath}${filename}`;

      await this.homeserverClient.delete(fullPath);
      logger.log('Deleted bookmark from homeserver:', fullPath);
    } catch (error) {
      logger.warn('Failed to delete bookmark:', fullPath, '-', error.message);
      // Don't throw - deletion might fail if file doesn't exist, which is okay
    }
  }

  /**
   * Collect top-level folders by name across all synced keys
   * Returns a Map of folderName -> Array<{pubkey, folderId, bookmarks}>
   */
  async collectTopLevelFoldersByName() {
    const foldersByName = new Map();

    try {
      // Get all pubkeys (own + monitored)
      const pubkey = await this.keyManager.getPublicKey();
      const monitored = await this.storage.getMonitoredPubkeys();
      const allPubkeys = pubkey ? [pubkey, ...monitored] : monitored;

      // For each pubkey, get its root folder and examine top-level children
      for (const pk of allPubkeys) {
        const rootFolderId = this.folderCache.get(pk);
        if (!rootFolderId) {
          logger.warn('No folder found for pubkey:', pk);
          continue;
        }

        // Get top-level children (folders only)
        const children = await browser.bookmarks.getChildren(rootFolderId);

        for (const child of children) {
          // Skip if not a folder, or if it's a special folder
          if (child.url) continue; // It's a bookmark, not a folder
          if (child.title === 'priv' || child.title === 'priv_sharing') continue;

          const folderName = child.title;

          // Get all bookmarks within this folder (recursively)
          const bookmarks = await this.getBookmarksInFolder(child.id);

          // Add to our map
          if (!foldersByName.has(folderName)) {
            foldersByName.set(folderName, []);
          }

          foldersByName.get(folderName).push({
            pubkey: pk,
            folderId: child.id,
            bookmarks: bookmarks
          });

          logger.log(`Found top-level folder "${folderName}" in ${pk.substring(0, 7)} with ${bookmarks.length} bookmarks`);
        }
      }

      return foldersByName;
    } catch (error) {
      logger.error('Failed to collect top-level folders:', error);
      return new Map();
    }
  }

  /**
   * Sync groups folders - merge bookmarks from matching folder names across all keys
   */
  async syncGroupsFolders() {
    try {
      logger.log('Starting groups folder sync...');

      // Ensure groups folder exists
      const groupsFolderId = await this.ensureGroupsFolder();

      // Collect all top-level folders grouped by name
      const foldersByName = await this.collectTopLevelFoldersByName();

      // Get existing folders in groups
      const existingGroupFolders = await browser.bookmarks.getChildren(groupsFolderId);
      const existingGroupFolderMap = new Map();
      for (const folder of existingGroupFolders) {
        if (!folder.url) {
          existingGroupFolderMap.set(folder.title, folder.id);
        }
      }

      // For each unique folder name, create/update group folder
      for (const [folderName, sources] of foldersByName.entries()) {
        logger.log(`Processing group folder: ${folderName} (from ${sources.length} source(s))`);

        // Collect all bookmarks from all sources
        const allBookmarks = [];
        for (const source of sources) {
          allBookmarks.push(...source.bookmarks);
        }

        // Remove duplicates based on URL, keeping newest timestamp
        const uniqueBookmarks = this.deduplicateBookmarks(allBookmarks);

        logger.log(`Group folder "${folderName}" has ${uniqueBookmarks.length} unique bookmarks (from ${allBookmarks.length} total)`);

        // Get or create group folder
        let groupFolderId;
        if (existingGroupFolderMap.has(folderName)) {
          groupFolderId = existingGroupFolderMap.get(folderName);
          logger.log(`Using existing group folder: ${folderName}`);
        } else {
          const newFolder = await browser.bookmarks.create({
            parentId: groupsFolderId,
            title: folderName
          });
          groupFolderId = newFolder.id;
          logger.log(`Created new group folder: ${folderName}`);
        }

        // Get existing bookmarks in this group folder
        const existingBookmarks = await this.getBookmarksInFolder(groupFolderId);
        const existingUrlMap = new Map(existingBookmarks.map(b => [b.url, b]));

        // Track folders we need to create for nested structure
        const folderCache = new Map();

        // Add or update bookmarks
        for (const bookmark of uniqueBookmarks) {
          const existing = existingUrlMap.get(bookmark.url);

          if (!existing) {
            // Create new bookmark with its folder structure
            const parentId = await this.getOrCreateSubfolder(groupFolderId, bookmark.path, folderCache);
            await browser.bookmarks.create({
              parentId: parentId,
              title: bookmark.title,
              url: bookmark.url
            });
            logger.log(`Added bookmark to group "${folderName}": ${bookmark.url}`);
          } else if (bookmark.timestamp > existing.timestamp) {
            // Update existing bookmark if newer
            await browser.bookmarks.update(existing.id, {
              title: bookmark.title,
              url: bookmark.url
            });
            logger.log(`Updated bookmark in group "${folderName}": ${bookmark.url}`);
          }

          // Remove from existing map (we'll delete any remaining)
          existingUrlMap.delete(bookmark.url);
        }

        // Remove bookmarks that no longer exist in any source
        for (const obsolete of existingUrlMap.values()) {
          await browser.bookmarks.remove(obsolete.id);
          logger.log(`Removed obsolete bookmark from group "${folderName}": ${obsolete.url}`);
        }
      }

      // Remove group folders that no longer have matching source folders
      for (const [folderName, folderId] of existingGroupFolderMap.entries()) {
        if (!foldersByName.has(folderName)) {
          await browser.bookmarks.removeTree(folderId);
          logger.log(`Removed obsolete group folder: ${folderName}`);
        }
      }

      logger.log('Groups folder sync completed');
    } catch (error) {
      logger.error('Failed to sync groups folders:', error);
      // Don't throw - this is a non-critical feature
    }
  }

  /**
   * Remove duplicate bookmarks based on URL, keeping the one with newest timestamp
   * @param {Array} bookmarks - Array of bookmark objects
   * @returns {Array} - Deduplicated array
   */
  deduplicateBookmarks(bookmarks) {
    const bookmarkMap = new Map();

    for (const bookmark of bookmarks) {
      const existing = bookmarkMap.get(bookmark.url);
      if (!existing || bookmark.timestamp > existing.timestamp) {
        bookmarkMap.set(bookmark.url, bookmark);
      }
    }

    return Array.from(bookmarkMap.values());
  }

  /**
   * Create a safe filename from URL using hash
   */
  async createFilename(url) {
    // Hash the URL to create a fixed-length filename
    const encoder = new TextEncoder();
    const data = encoder.encode(url);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);

    // Take first 16 bytes and convert to hex
    const hex = Array.from(hashArray.slice(0, 16))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return hex;
  }

  /**
   * Mark all bookmarks in a folder tree as deleted (recursively)
   * @param {Array} children - Array of bookmark nodes
   * @param {number} timestamp - Timestamp for deletion
   * @param {string} basePath - Base path for this folder
   */
  async markFolderContentsDeleted(children, timestamp, basePath) {
    for (const child of children) {
      if (child.url) {
        // It's a bookmark - mark as deleted
        await this.storage.markDeleted(child.url, timestamp, basePath);
        await this.storage.removeBookmarkMeta(child.url);
        logger.log('Marked bookmark as deleted:', child.url, 'path:', basePath);
      } else if (child.children) {
        // It's a subfolder - recurse
        const childPath = `${basePath}${child.title}/`;
        await this.markFolderContentsDeleted(child.children, timestamp, childPath);
      }
    }
  }

  /**
   * Create a folder on homeserver
   * @param {string} path - Relative path like "tag1/" or "tag1/tag2/"
   */
  async createFolderOnHomeserver(path) {
    try {
      // Homeserver directories are created implicitly when you PUT a file
      // So we create a temporary marker file to ensure the directory exists
      const fullPath = `/pub/booky/${path}.keep`;

      // Put an empty marker file
      await this.homeserverClient.put(fullPath, {
        _marker: true,
        created: Date.now()
      });

      logger.log('Created folder on homeserver:', path);
    } catch (error) {
      logger.warn('Failed to create folder on homeserver:', path, error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Delete a folder from homeserver (recursively deletes all contents)
   * @param {string} path - Relative path like "tag1/" or "tag1/tag2/"
   */
  async deleteFolderFromHomeserver(path) {
    try {
      const basePath = '/pub/booky/';
      const fullPath = `${basePath}${path}`;

      // List all entries in this folder
      const entries = await this.homeserverClient.list(fullPath);

      // Delete all entries recursively
      for (const entry of entries) {
        try {
          if (entry.endsWith('/')) {
            // It's a subdirectory - recurse
            const entryName = entry.split('/').filter(s => s).pop();
            await this.deleteFolderFromHomeserver(`${path}${entryName}/`);
          } else {
            // It's a file - delete it
            // Extract the path relative to the base
            let entryPath = entry;
            if (entry.startsWith('pubky://')) {
              const parts = entry.split('/');
              const pubkeyIndex = parts.findIndex(p => p && p.length > 20);
              if (pubkeyIndex >= 0) {
                entryPath = '/' + parts.slice(pubkeyIndex + 1).join('/');
              }
            }
            await this.homeserverClient.delete(entryPath);
            logger.log('Deleted file from homeserver:', entryPath);
          }
        } catch (error) {
          logger.warn('Failed to delete entry:', entry, error);
        }
      }

      // Delete the .keep marker file if it exists
      try {
        await this.homeserverClient.delete(`${fullPath}.keep`);
      } catch (error) {
        // Ignore - .keep might not exist
      }

      logger.log('Deleted folder from homeserver:', path);
    } catch (error) {
      logger.warn('Failed to delete folder from homeserver:', path, error);
      // Don't throw - this is not critical
    }
  }
}

