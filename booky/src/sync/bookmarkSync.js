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
      
      // Update local timestamp for this bookmark
      if (bookmark.url) {
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
        
        // Handle URL change
        if (changeInfo.url) {
          const oldUrl = changeInfo.url;
          const newUrl = bookmarks[0].url;
          
          logger.log('Bookmark URL changed:', oldUrl, '->', newUrl);
          
          // Mark old URL as deleted
          await this.storage.markDeleted(oldUrl, timestamp);
          await this.storage.removeBookmarkMeta(oldUrl);
        }
        
        // Update timestamp for current URL
        await this.storage.setBookmarkMeta(bookmarks[0].url, {
          url: bookmarks[0].url,
          timestamp: timestamp
        });
        
        logger.log('Bookmark changed, triggering sync:', bookmarks[0].url);
        this.triggerSyncAfterDelay();
      }
    });

    // Listen for bookmark removal - trigger sync
    browser.bookmarks.onRemoved.addListener(async (id, removeInfo) => {
      if (this.ignoreEvents) {
        return;
      }

      // Get URL from removeInfo.node or metadata
      let url = null;
      if (removeInfo.node && removeInfo.node.url) {
        url = removeInfo.node.url;
      }

      if (url) {
        const timestamp = Date.now();
        
        // Mark as deleted
        await this.storage.markDeleted(url, timestamp);
        await this.storage.removeBookmarkMeta(url);
        
        logger.log('Bookmark removed, triggering sync:', url);
        this.triggerSyncAfterDelay();
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
        return bookmarks;
      } else {
        // Use public storage for other users (addressed path)
        const address = `${pubkey}/pub/booky/`;
        entries = await this.homeserverClient.listPublic(address);

        const bookmarks = [];
        for (const entry of entries) {
          try {
            // Extract filename from pubky:// URL
            const filename = entry.split('/').pop();
            const data = await this.homeserverClient.getPublic(`${address}${filename}`);
            bookmarks.push(data);
          } catch (error) {
            logger.warn('Failed to fetch bookmark:', entry, error);
          }
        }
        return bookmarks;
      }
    } catch (error) {
      // If list fails, assume no bookmarks exist yet
      logger.warn('Failed to list remote bookmarks:', error);
      return [];
    }
  }

  /**
   * Two-way merge: sync changes in both directions based on timestamps
   */
  async mergeTwoWay(folderId, localBookmarks, remoteBookmarks, pubkey) {
    const localMap = new Map(localBookmarks.map(b => [b.url, b]));
    const remoteMap = new Map(remoteBookmarks.map(b => [b.url, b]));

    // Process each local bookmark
    for (const local of localBookmarks) {
      const remote = remoteMap.get(local.url);
      if (!remote) {
        // Exists locally but not remotely - push to remote
        await this.pushBookmark(local);
      } else if (local.timestamp > remote.timestamp) {
        // Local is newer - update remote
        await this.pushBookmark(local);
      }
      // If remote.timestamp >= local.timestamp, remote wins (handled below)
    }

    // Process each remote bookmark
    for (const remote of remoteBookmarks) {
      const local = localMap.get(remote.url);
      const deletedInfo = await this.storage.isDeleted(remote.url);
      
      if (!local) {
        // Exists remotely but not locally
        // Check if we deleted it
        if (deletedInfo && deletedInfo.timestamp > remote.timestamp) {
          // We deleted it after this version - delete from remote
          logger.log('Deleting from remote (tombstone):', remote.url);
          await this.deleteBookmarkByUrl(remote.url);
        } else {
          // We don't have it and didn't delete it - pull from remote
          logger.log('Pulling from remote:', remote.url);
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
          
          // Clear any old tombstone
          if (deletedInfo) {
            await this.storage.clearDeleted(remote.url);
          }
        }
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

    // Pull new/updated remote bookmarks to local
    for (const remote of remoteBookmarks) {
      // CRITICAL: Skip if currently being deleted
      if (this.deletingUrls.has(remote.url)) {
        logger.log('Skipping restore - deletion in progress:', remote.url);
        continue;
      }
      
      const local = localMap.get(remote.url);

      // Check if this URL was deleted locally (tombstone check)
      const deletedInfo = await this.storage.isDeleted(remote.url);

      if (!local) {
        // Check if we deleted it locally after this remote version
        if (deletedInfo && deletedInfo.timestamp > remote.timestamp) {
          // We deleted it locally after this version, don't restore
          logger.log('Skipping restore of deleted bookmark (tombstone):', remote.url);
          continue;
        }

        // Doesn't exist locally and wasn't deleted, create it
        await browser.bookmarks.create({
          parentId: folderId,
          title: remote.title,
          url: remote.url
        });

        // Store metadata for the bookmark (keyed by URL)
        await this.storage.setBookmarkMeta(remote.url, {
          url: remote.url,
          timestamp: remote.timestamp
        });

        // Clear deletion marker if exists (remote has newer version)
        if (deletedInfo) {
          await this.storage.clearDeleted(remote.url);
        }
      } else if (remote.timestamp > local.timestamp) {
        // Remote is newer, update local
        await browser.bookmarks.update(local.id, {
          title: remote.title,
          url: remote.url
        });

        // Update metadata (keyed by URL)
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
      const filename = this.createFilename(bookmark.url);

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
      const filename = this.createFilename(bookmark.url);
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
      const filename = this.createFilename(url);
      const path = `/pub/booky/${filename}`;
      
      await this.homeserverClient.delete(path);
      
      logger.log('Deleted bookmark by URL:', url);
    } catch (error) {
      logger.warn('Failed to delete bookmark by URL:', error);
    }
  }

  /**
   * Create a safe filename from URL
   */
  createFilename(url) {
    // Use a hash or encoded version of the URL
    const encoded = encodeURIComponent(url);
    // Limit length and make it filesystem-safe
    return encoded.substring(0, 100).replace(/[^a-zA-Z0-9_-]/g, '_');
  }
}

