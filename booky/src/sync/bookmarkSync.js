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
    // Listen for bookmark creation
    browser.bookmarks.onCreated.addListener((id, bookmark) => {
      this.handleBookmarkChange('created', bookmark);
    });

    // Listen for bookmark changes
    browser.bookmarks.onChanged.addListener((id, changeInfo) => {
      browser.bookmarks.get(id).then(bookmarks => {
        if (bookmarks.length > 0) {
          this.handleBookmarkChange('changed', bookmarks[0]);
        }
      });
    });

    // Listen for bookmark removal
    browser.bookmarks.onRemoved.addListener((id, removeInfo) => {
      this.handleBookmarkChange('removed', { id, ...removeInfo });
    });
  }

  /**
   * Handle bookmark changes
   */
  async handleBookmarkChange(changeType, bookmark) {
    try {
      // Check if this bookmark is in our main folder
      const pubkey = await this.keyManager.getPublicKey();
      if (!pubkey) return;

      const mainFolderId = await this.getOrCreateFolder(pubkey);
      if (await this.isInFolder(bookmark.id || bookmark.parentId, mainFolderId)) {
        logger.log(`Bookmark ${changeType}:`, bookmark);
        // Trigger immediate sync for main folder
        await this.syncFolder(pubkey, true);
      }
    } catch (error) {
      logger.error('Error handling bookmark change:', error);
    }
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

    const traverse = (node) => {
      if (node.url) {
        bookmarks.push({
          id: node.id,
          url: node.url,
          title: node.title || '',
          timestamp: node.dateAdded || Date.now()
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
   * Two-way merge: sync changes in both directions
   */
  async mergeTwoWay(folderId, localBookmarks, remoteBookmarks, pubkey) {
    const localMap = new Map(localBookmarks.map(b => [b.url, b]));
    const remoteMap = new Map(remoteBookmarks.map(b => [b.url, b]));

    // Push new/updated local bookmarks to remote
    for (const local of localBookmarks) {
      const remote = remoteMap.get(local.url);
      if (!remote || local.timestamp > remote.timestamp) {
        // Local is newer or doesn't exist remotely
        await this.pushBookmark(local);
      }
    }

    // Pull new/updated remote bookmarks to local
    for (const remote of remoteBookmarks) {
      const local = localMap.get(remote.url);
      if (!local) {
        // Doesn't exist locally, create it
        await browser.bookmarks.create({
          parentId: folderId,
          title: remote.title,
          url: remote.url
        });
      } else if (remote.timestamp > local.timestamp) {
        // Remote is newer, update local
        await browser.bookmarks.update(local.id, {
          title: remote.title,
          url: remote.url
        });
      }
    }

    // Remove local bookmarks that don't exist remotely
    for (const local of localBookmarks) {
      if (!remoteMap.has(local.url)) {
        await browser.bookmarks.remove(local.id);
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
        timestamp: bookmark.timestamp || Date.now(),
        id: bookmark.id
      };

      // Create a safe filename from URL
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
   * Create a safe filename from URL
   */
  createFilename(url) {
    // Use a hash or encoded version of the URL
    const encoded = encodeURIComponent(url);
    // Limit length and make it filesystem-safe
    return encoded.substring(0, 100).replace(/[^a-zA-Z0-9_-]/g, '_');
  }
}

