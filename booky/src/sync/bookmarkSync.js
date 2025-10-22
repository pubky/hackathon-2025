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
    browser.bookmarks.onCreated.addListener((id, bookmark) => {
      if (this.ignoreEvents) {
        return;
      }

      // Cache the URL for this browser ID
      if (bookmark.url) {
        this.urlCache.set(id, bookmark.url);
        
        const timestamp = Date.now();
        this.storage.setBookmarkMeta(bookmark.url, {
          url: bookmark.url,
          timestamp: timestamp
        }).then(() => {
          logger.log('Bookmark created, triggering sync:', bookmark.url);
          this.triggerSyncAfterDelay();
        });
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

        // Mark as deleted
        await this.storage.markDeleted(url, timestamp);
        await this.storage.removeBookmarkMeta(url);

        // Remove from cache
        this.urlCache.delete(id);

        logger.log('Bookmark removed, triggering sync:', url);
        this.triggerSyncAfterDelay();
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

        // Check if the new parent is one of our synced folders
        let isInSyncedFolder = false;
        for (const pk of allPubkeys) {
          const folderId = this.folderCache.get(pk);
          if (folderId && await this.isInFolder(id, folderId)) {
            isInSyncedFolder = true;
            break;
          }
        }

        if (isInSyncedFolder) {
          // Moved into a synced folder - treat as new bookmark
          const timestamp = Date.now();
          await this.storage.setBookmarkMeta(url, {
            url: url,
            timestamp: timestamp
          });

          logger.log('Bookmark moved into synced folder, triggering sync:', url);
          this.triggerSyncAfterDelay();
        } else {
          // Moved out of synced folder - treat as deletion
          const timestamp = Date.now();
          await this.storage.markDeleted(url, timestamp);
          await this.storage.removeBookmarkMeta(url);

          logger.log('Bookmark moved out of synced folder, triggering sync:', url);
          this.triggerSyncAfterDelay();
        }
      }
    });
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
   * Get or create bookmark folder for a pubkey
   */
  async getOrCreateFolder(pubkey) {
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
      return folder.id;
    } catch (error) {
      logger.error('Failed to get/create folder:', error);
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

      const folderId = await this.getOrCreateFolder(pubkey);

      // Get local bookmarks
      const localBookmarks = await this.getBookmarksInFolder(folderId);

      // Get remote bookmarks
      const remoteBookmarks = await this.fetchRemoteBookmarks(pubkey, isTwoWay);

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

    const traverse = (node) => {
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
          timestamp: timestamp
        });
      }
      if (node.children) {
        node.children.forEach(traverse);
      }
    };

    if (folder.length > 0) {
      traverse(folder[0]);
    }

    return bookmarks;
  }

  /**
   * Fetch remote bookmarks from homeserver
   */
  async fetchRemoteBookmarks(pubkey, isOwnData) {
    try {
      let entries;

      if (isOwnData) {
        // Use session storage for own data (absolute path)
        const path = '/pub/booky/';
        logger.log('Fetching own bookmarks from:', path);
        entries = await this.homeserverClient.list(path);

        const bookmarks = [];
        for (const entry of entries) {
          try {
            // Extract filename from pubky:// URL
            const filename = entry.split('/').pop();
            const data = await this.homeserverClient.get(`${path}${filename}`);
            bookmarks.push(data);
          } catch (error) {
            logger.warn('Failed to fetch bookmark:', entry, error);
          }
        }
        logger.log('Successfully fetched', bookmarks.length, 'bookmarks for own data');
        return bookmarks;
      } else {
        // Use public storage for other users (addressed path)
        // Format: pubky://<pubkey>/<path>
        const address = `pubky://${pubkey}/pub/booky/`;
        logger.log('Fetching public bookmarks for:', pubkey);

        try {
          entries = await this.homeserverClient.listPublic(address);
          logger.log('Found', entries.length, 'bookmark entries for', pubkey);
        } catch (listError) {
          logger.error('Failed to list public bookmarks for', pubkey, ':', listError);
          logger.error('Address used:', address);
          throw listError;
        }

        const bookmarks = [];
        for (const entry of entries) {
          try {
            // Extract filename from pubky:// URL
            const filename = entry.split('/').pop();
            const fullAddress = `pubky://${pubkey}/pub/booky/${filename}`;
            const data = await this.homeserverClient.getPublic(fullAddress);
            bookmarks.push(data);
          } catch (error) {
            logger.warn('Failed to fetch bookmark:', entry, error);
          }
        }
        logger.log('Successfully fetched', bookmarks.length, 'bookmarks for', pubkey);
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
   * Two-way merge: sync changes in both directions based on timestamps
   */
  async mergeTwoWay(folderId, localBookmarks, remoteBookmarks, pubkey) {
    const localMap = new Map(localBookmarks.map(b => [b.url, b]));
    const remoteMap = new Map(remoteBookmarks.map(b => [b.url, b]));

    // PHASE 1: Process deletions FIRST (tombstones take priority)
    for (const remote of remoteBookmarks) {
      const local = localMap.get(remote.url);
      const deletedInfo = await this.storage.isDeleted(remote.url);

      if (!local && deletedInfo) {
        // We deleted this URL locally - delete from remote
        logger.log('Deleting from remote (tombstone):', remote.url);
        await this.deleteBookmarkByUrl(remote.url);
      }
    }

    // PHASE 2: Push local bookmarks (new or updated)
    for (const local of localBookmarks) {
      const remote = remoteMap.get(local.url);
      if (!remote) {
        // Exists locally but not remotely - push to remote
        logger.log('Pushing to remote (new):', local.url);
        await this.pushBookmark(local);
      } else if (local.timestamp > remote.timestamp) {
        // Local is newer - update remote
        logger.log('Pushing to remote (newer):', local.url);
        await this.pushBookmark(local);
      }
    }

    // PHASE 3: Pull remote bookmarks (new or updated)
    for (const remote of remoteBookmarks) {
      const local = localMap.get(remote.url);
      const deletedInfo = await this.storage.isDeleted(remote.url);

      // Skip if we already deleted it in phase 1
      if (deletedInfo) {
        continue;
      }

      if (!local) {
        // Doesn't exist locally and not deleted - pull from remote
        logger.log('Pulling from remote (new):', remote.url);
        await browser.bookmarks.create({
          parentId: folderId,
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
        logger.log('Updating from remote (newer):', remote.url);
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
    const localMap = new Map(localBookmarks.map(b => [b.url, b]));

    // Add or update bookmarks from remote
    for (const remote of remoteBookmarks) {
      const local = localMap.get(remote.url);
      if (!local) {
        // Create new bookmark
        await browser.bookmarks.create({
          parentId: folderId,
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
    const remoteUrls = new Set(remoteBookmarks.map(b => b.url));
    for (const local of localBookmarks) {
      if (!remoteUrls.has(local.url)) {
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

      // Use session storage with absolute path
      await this.homeserverClient.put(`/pub/booky/${filename}`, data);

      logger.log('Pushed bookmark:', bookmark.url);
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
      const path = `/pub/booky/${filename}`;
      
      // Delete from homeserver (use DELETE method via session.storage)
      await this.homeserverClient.delete(path);
      
      logger.log('Deleted bookmark from homeserver:', bookmark.url);
    } catch (error) {
      logger.warn('Failed to delete bookmark from homeserver:', error);
      // Don't throw - deletion might fail if it doesn't exist
    }
  }

  /**
   * Delete a bookmark by URL
   */
  async deleteBookmarkByUrl(url) {
    try {
      const filename = await this.createFilename(url);
      const path = `/pub/booky/${filename}`;
      
      await this.homeserverClient.delete(path);
      
      logger.log('Deleted bookmark by URL:', url);
    } catch (error) {
      logger.warn('Failed to delete bookmark by URL:', error);
    }
  }

  /**
   * Remove duplicate bookmarks (same URL) from a folder
   */
  async removeDuplicates(folderId) {
    try {
      const bookmarks = await this.getBookmarksInFolder(folderId);
      const urlMap = new Map();
      const duplicates = [];

      // Find duplicates
      for (const bookmark of bookmarks) {
        if (urlMap.has(bookmark.url)) {
          // Duplicate found
          const existing = urlMap.get(bookmark.url);
          
          // Keep the one with newer timestamp, remove the other
          if (bookmark.timestamp > existing.timestamp) {
            duplicates.push(existing.id);
            urlMap.set(bookmark.url, bookmark);
          } else {
            duplicates.push(bookmark.id);
          }
        } else {
          urlMap.set(bookmark.url, bookmark);
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
}

