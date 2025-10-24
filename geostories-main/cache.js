/**
 * GeoStories Cache Manager
 * Handles caching of friends and markers data using IndexedDB and localStorage
 */

export class CacheManager {
    constructor() {
        this.dbName = 'geostories_cache';
        this.dbVersion = 1;
        this.db = null;

        // Cache expiration times (in milliseconds)
        this.FRIENDS_CACHE_TTL = 60 * 60 * 1000; // 1 hour
        this.MARKERS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

        // LocalStorage keys
        this.FRIENDS_CACHE_KEY = 'geostories_friends_cache';
        this.FRIENDS_CACHE_TIME_KEY = 'geostories_friends_cache_time';
    }

    /**
     * Initialize IndexedDB for markers caching
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('IndexedDB failed to open:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object store for markers if it doesn't exist
                if (!db.objectStoreNames.contains('markers')) {
                    const markersStore = db.createObjectStore('markers', { keyPath: 'cacheKey' });
                    markersStore.createIndex('pubky', 'pubky', { unique: false });
                    markersStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    // ==================== Friends List Caching (localStorage) ====================

    /**
     * Save friends list to localStorage
     */
    saveFriendsList(friends) {
        try {
            const cacheData = {
                friends: friends,
                timestamp: Date.now()
            };
            localStorage.setItem(this.FRIENDS_CACHE_KEY, JSON.stringify(cacheData));
            return true;
        } catch (error) {
            console.error('[Cache] Failed to save friends list:', error);
            return false;
        }
    }

    /**
     * Load friends list from localStorage
     * Returns cached data with metadata about freshness (never expires, just marks as stale)
     */
    loadFriendsList() {
        try {
            const cached = localStorage.getItem(this.FRIENDS_CACHE_KEY);
            if (!cached) {
                return null;
            }

            const cacheData = JSON.parse(cached);

            // Validate cache structure
            if (!cacheData.friends || !cacheData.timestamp) {
                console.warn('[Cache] Invalid friends cache structure, clearing...');
                this.clearFriendsCache();
                return null;
            }

            const age = Date.now() - cacheData.timestamp;
            const isStale = age > this.FRIENDS_CACHE_TTL;

            // Always return cached data, but include freshness info
            return {
                data: cacheData.friends,
                isStale: isStale,
                age: age
            };
        } catch (error) {
            console.error('[Cache] Failed to load friends list:', error);
            // Clear corrupted cache
            this.clearFriendsCache();
            return null;
        }
    }

    /**
     * Clear friends cache
     */
    clearFriendsCache() {
        try {
            localStorage.removeItem(this.FRIENDS_CACHE_KEY);
            return true;
        } catch (error) {
            console.error('[Cache] Failed to clear friends cache:', error);
            return false;
        }
    }

    /**
     * Check if friends cache is valid (not expired)
     */
    isFriendsCacheValid() {
        try {
            const cached = localStorage.getItem(this.FRIENDS_CACHE_KEY);
            if (!cached) return false;

            const cacheData = JSON.parse(cached);
            const age = Date.now() - cacheData.timestamp;
            return age <= this.FRIENDS_CACHE_TTL;
        } catch (error) {
            return false;
        }
    }

    // ==================== Markers Caching (IndexedDB) ====================

    /**
     * Save markers for a specific user to IndexedDB
     */
    async saveMarkers(pubky, markers) {
        if (!this.db) {
            console.warn('[Cache] IndexedDB not initialized');
            return false;
        }

        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['markers'], 'readwrite');
                const store = transaction.objectStore('markers');

                const cacheData = {
                    cacheKey: pubky,
                    pubky: pubky,
                    markers: markers,
                    timestamp: Date.now()
                };

                const request = store.put(cacheData);

                request.onsuccess = () => {
                    resolve(true);
                };

                request.onerror = () => {
                    console.error('[Cache] Failed to save markers:', request.error);
                    reject(request.error);
                };
            } catch (error) {
                console.error('[Cache] Error saving markers:', error);
                reject(error);
            }
        });
    }

    /**
     * Load markers for a specific user from IndexedDB
     * Returns cached data with metadata about freshness (never expires, just marks as stale)
     */
    async loadMarkers(pubky) {
        if (!this.db) {
            console.warn('[Cache] IndexedDB not initialized');
            return null;
        }

        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['markers'], 'readonly');
                const store = transaction.objectStore('markers');
                const request = store.get(pubky);

                request.onsuccess = () => {
                    const cacheData = request.result;

                    if (!cacheData) {
                        resolve(null);
                        return;
                    }

                    // Validate cache structure
                    if (!cacheData.markers || !cacheData.timestamp) {
                        console.warn('[Cache] Invalid markers cache structure, clearing...');
                        this.clearMarkersForUser(pubky);
                        resolve(null);
                        return;
                    }

                    const age = Date.now() - cacheData.timestamp;
                    const isStale = age > this.MARKERS_CACHE_TTL;

                    // Always return cached data, but include freshness info
                    resolve({
                        data: cacheData.markers,
                        isStale: isStale,
                        age: age
                    });
                };

                request.onerror = () => {
                    console.error('[Cache] Failed to load markers:', request.error);
                    resolve(null);
                };
            } catch (error) {
                console.error('[Cache] Error loading markers:', error);
                resolve(null);
            }
        });
    }

    /**
     * Clear markers cache for a specific user
     */
    async clearMarkersForUser(pubky) {
        if (!this.db) return false;

        return new Promise((resolve) => {
            try {
                const transaction = this.db.transaction(['markers'], 'readwrite');
                const store = transaction.objectStore('markers');
                const request = store.delete(pubky);

                request.onsuccess = () => {
                    resolve(true);
                };

                request.onerror = () => {
                    console.error('[Cache] Failed to clear markers:', request.error);
                    resolve(false);
                };
            } catch (error) {
                console.error('[Cache] Error clearing markers:', error);
                resolve(false);
            }
        });
    }

    /**
     * Clear all markers cache
     */
    async clearAllMarkers() {
        if (!this.db) return false;

        return new Promise((resolve) => {
            try {
                const transaction = this.db.transaction(['markers'], 'readwrite');
                const store = transaction.objectStore('markers');
                const request = store.clear();

                request.onsuccess = () => {
                    resolve(true);
                };

                request.onerror = () => {
                    console.error('[Cache] Failed to clear all markers:', request.error);
                    resolve(false);
                };
            } catch (error) {
                console.error('[Cache] Error clearing all markers:', error);
                resolve(false);
            }
        });
    }

    /**
     * Get cache statistics
     */
    async getCacheStats() {
        const stats = {
            friends: null,
            markers: []
        };

        // Friends cache stats
        try {
            const cached = localStorage.getItem(this.FRIENDS_CACHE_KEY);
            if (cached) {
                const cacheData = JSON.parse(cached);
                const age = Date.now() - cacheData.timestamp;
                stats.friends = {
                    count: cacheData.friends.length,
                    age: age,
                    ageMinutes: Math.round(age / 1000 / 60),
                    valid: age <= this.FRIENDS_CACHE_TTL
                };
            }
        } catch (error) {
            console.error('[Cache] Error getting friends stats:', error);
        }

        // Markers cache stats
        if (this.db) {
            try {
                const markerStats = await new Promise((resolve) => {
                    const transaction = this.db.transaction(['markers'], 'readonly');
                    const store = transaction.objectStore('markers');
                    const request = store.getAll();

                    request.onsuccess = () => {
                        const allCaches = request.result || [];
                        const markerList = allCaches.map(cache => ({
                            pubky: cache.pubky,
                            count: cache.markers.length,
                            age: Date.now() - cache.timestamp,
                            ageMinutes: Math.round((Date.now() - cache.timestamp) / 1000 / 60),
                            valid: (Date.now() - cache.timestamp) <= this.MARKERS_CACHE_TTL
                        }));
                        resolve(markerList);
                    };

                    request.onerror = () => resolve([]);
                });

                stats.markers = markerStats;
            } catch (error) {
                console.error('[Cache] Error getting marker stats:', error);
            }
        }

        return stats;
    }

    /**
     * Clear all caches (friends + markers)
     */
    async clearAllCaches() {
        this.clearFriendsCache();
        await this.clearAllMarkers();
        return true;
    }
}
