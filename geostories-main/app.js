import { Pubky, Keypair, PublicKey, setLogLevel } from '@synonymdev/pubky';
import * as jdenticon from 'jdenticon';
import { CacheManager } from './cache.js';

class GeoStoriesApp {
    constructor() {
        this.pubky = null;
        this.session = null;
        this.signer = null;
        this.authFlow = null;
        this.map = null;
        this.markers = new Map(); // Store markers by ID
        this.markerLayers = new Map(); // Store Leaflet marker layers
        this.currentMarkerLocation = null;
        this.currentPubky = null; // Currently viewing pubky
        this.authMode = 'qr'; // 'qr' for Pubky Auth, 'local' for testnet signup
        this.editingMarkerId = null; // Track which marker is being edited
        this.friendsWithMarkers = []; // Cache of friends with GeoStory markers
        this.friendColorMap = new Map(); // Map friend pubkeys to colors

        // Session persistence constants
        this.SESSION_STORAGE_KEY = 'geostories_session';
        this.SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

        // Initialize cache manager
        this.cache = new CacheManager();
        this.cache.init().catch(err => {
            console.error('[App] Failed to initialize cache:', err);
        });

        // Color palette for friends (vibrant, distinguishable colors)
        this.friendColors = [
            '#A29BFE', // Lavender
            '#4ECDC4', // Teal
            '#45B7D1', // Blue
            '#FFA07A', // Light Salmon
            '#98D8C8', // Mint
            '#F7B731', // Yellow
            '#5F27CD', // Purple
            '#00D2D3', // Cyan
            '#FF9FF3', // Pink
            '#54A0FF', // Light Blue
            '#48DBFB', // Sky Blue
            '#1DD1A1', // Green
            '#F368E0', // Magenta
            '#FF9F43', // Orange
            '#00B894', // Emerald
            '#6C5CE7', // Indigo
            '#FD79A8', // Rose
            '#FDCB6E', // Mustard
            '#74B9FF', // Periwinkle
            '#FF6B6B', // Red
        ];

        this.initMap();
        this.initResizableSidebar();
        this.initUserMenuClickOutside();
        this.initMobileSidebarToggle();
        this.initResponsiveHandler();

        // Initialize mobile FAB to unauthenticated state
        this.updateMobileFAB(false);

        // Try to restore session before connecting
        this.sessionRestored = false;
        this.restoreSession().then(restored => {
            this.sessionRestored = restored;
        });

        this.connect(); // Auto-connect on page load

        // Check for pubky in URL path and load markers
        this.checkUrlForPubky();

        // Initialize browser navigation (back/forward buttons)
        this.initUrlNavigation();
    }

    // Handle responsive layout changes
    initResponsiveHandler() {
        let resizeTimer;
        let currentMode = null;

        const updateMode = () => {
            const header = document.querySelector('header');
            const sidebar = document.getElementById('sidebar');
            const backdrop = document.getElementById('mobileBackdrop');
            const container = document.querySelector('.container');
            const isDesktop = window.innerWidth > 768;

            // Avoid redundant updates
            if (currentMode === (isDesktop ? 'desktop' : 'mobile')) {
                return;
            }

            currentMode = isDesktop ? 'desktop' : 'mobile';

            if (isDesktop) {
                // Desktop mode
                header.classList.add('desktop-mode');
                header.classList.remove('mobile-hidden');
                sidebar.classList.add('desktop-mode');
                sidebar.classList.remove('show');
                container.classList.add('desktop-mode');
                backdrop.classList.remove('active');
                document.body.style.overflow = '';
            } else {
                // Mobile mode
                header.classList.remove('desktop-mode');
                header.classList.remove('mobile-hidden');
                sidebar.classList.remove('desktop-mode');
                container.classList.remove('desktop-mode');
                sidebar.classList.remove('show');
                backdrop.classList.remove('active');
                document.body.style.overflow = '';
            }

            // Invalidate map size
            if (this.map) {
                requestAnimationFrame(() => {
                    this.map.invalidateSize();
                });
            }
        };

        // Set initial mode
        updateMode();

        // Handle resize
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(updateMode, 100);
        });

        // Handle orientation changes on mobile devices
        window.addEventListener('orientationchange', () => {
            setTimeout(updateMode, 50);
        });
    }

    // Initialize mobile sidebar toggle
    initMobileSidebarToggle() {
        // Mobile-specific functionality is handled by showMobileAddStory and showMobileStories
    }

    // Show Add Story form on mobile
    showMobileAddStory() {
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('mobileBackdrop');
        const header = document.querySelector('header');

        // Show Add Story tab
        this.switchTab('add');

        // Hide header on mobile to maximize map view
        if (window.innerWidth <= 768) {
            header.classList.add('mobile-hidden');
        }

        // Show sidebar with backdrop
        sidebar.classList.add('show');
        backdrop.classList.add('active');
    }

    // Show View Stories on mobile
    showMobileStories() {
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('mobileBackdrop');
        const header = document.querySelector('header');

        // Show View Stories tab
        this.switchTab('view');

        // Hide header on mobile to maximize map view
        if (window.innerWidth <= 768) {
            header.classList.add('mobile-hidden');
        }

        // Show sidebar with backdrop
        sidebar.classList.add('show');
        backdrop.classList.add('active');
    }

    // Close mobile sidebar
    closeMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('mobileBackdrop');
        const header = document.querySelector('header');

        // Show header again
        header.classList.remove('mobile-hidden');

        sidebar.classList.remove('show');
        backdrop.classList.remove('active');
    }

    // Initialize click-outside handler for user menu
    initUserMenuClickOutside() {
        document.addEventListener('click', (e) => {
            const userMenu = document.getElementById('userMenu');
            const dropdown = document.getElementById('userDropdown');

            if (!userMenu || userMenu.classList.contains('hidden')) {
                return;
            }

            // Check if click is outside the user menu
            if (!userMenu.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });
    }

    // ==================== URL Deep Linking ====================

    // Update the browser URL to reflect the current pubky being viewed
    updateUrlForPubky(pubky) {
        if (!pubky) {
            // If no pubky, reset to home
            window.history.pushState({ pubky: null }, '', '/');
            return;
        }

        // Strip 'pk:' prefix if present
        const cleanPubky = pubky.replace(/^pk:/, '');

        // Update URL without reloading the page
        const newUrl = `/${cleanPubky}`;
        window.history.pushState({ pubky: cleanPubky }, '', newUrl);
        this.log(`URL updated to: ${newUrl}`);
    }

    // Check URL for pubky parameter and auto-load markers
    checkUrlForPubky() {
        // First check if we were redirected from 404.html
        const redirectPath = sessionStorage.getItem('redirect');
        if (redirectPath) {
            sessionStorage.removeItem('redirect');
            // Use the redirect path and update the URL
            window.history.replaceState({ pubky: redirectPath.replace(/^\//, '').replace(/^pk:/, '') }, '', redirectPath);
        }

        // Get the path from the URL (everything after the domain)
        const path = window.location.pathname;

        // Extract pubky from path like /q9x5sfjbpajdebk45b9jashgb86iem7rnwpmu16px3ens63xzwro
        // or /pk:q9x5sfjbpajdebk45b9jashgb86iem7rnwpmu16px3ens63xzwro
        // Remove leading slash if present
        let pubky = path.replace(/^\//, '').trim();

        // Strip 'pk:' prefix if present
        pubky = pubky.replace(/^pk:/, '');

        // Basic validation: pubky should be a long alphanumeric string (typically 52 chars)
        // and shouldn't be empty or a common path like 'index.html'
        if (pubky && pubky.length > 40 && /^[a-z0-9]+$/.test(pubky)) {
            this.log(`Found pubky in URL: ${pubky}`);

            // Wait for pubky client to initialize, then load markers
            const loadFromUrl = async () => {
                // Wait a bit longer for pubky to be ready
                let attempts = 0;
                while (!this.pubky && attempts < 20) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }

                if (this.pubky) {
                    // Set the pubky in the header search box
                    document.getElementById('pubkyInputHeader').value = pubky;

                    // Load the markers for this pubky (skip URL update since we're loading from URL)
                    this.loadUserMarkers(pubky, false);

                    this.log(`Auto-loading markers from URL for: ${pubky.substring(0, 16)}...`);
                } else {
                    this.log('Pubky client not ready, skipping URL auto-load');
                }
            };

            loadFromUrl();
        }
    }

    // Handle browser back/forward navigation
    initUrlNavigation() {
        window.addEventListener('popstate', (event) => {
            this.log(`Popstate event fired. State: ${JSON.stringify(event.state)}`);
            this.log(`Current pathname: ${window.location.pathname}`);

            const pubky = event.state?.pubky;

            if (pubky) {
                // User navigated back/forward to a specific pubky
                this.log(`Navigating to pubky from browser history: ${pubky.substring(0, 16)}...`);
                document.getElementById('pubkyInputHeader').value = pubky;
                this.loadUserMarkers(pubky, false); // false = don't update URL
            } else {
                // User navigated back to home - try to extract pubky from URL
                const path = window.location.pathname;
                let pubkyFromPath = path.replace(/^\//, '').trim();

                // Strip 'pk:' prefix if present
                pubkyFromPath = pubkyFromPath.replace(/^pk:/, '');

                this.log(`No state found. Extracted pubky from path: ${pubkyFromPath}`);

                // Check if path contains a valid pubky
                if (pubkyFromPath && pubkyFromPath.length > 40 && /^[a-z0-9]+$/.test(pubkyFromPath)) {
                    this.log(`Loading markers from path: ${pubkyFromPath.substring(0, 16)}...`);
                    document.getElementById('pubkyInputHeader').value = pubkyFromPath;
                    this.loadUserMarkers(pubkyFromPath, false);
                } else {
                    this.log('Navigating to home from browser history');
                    document.getElementById('pubkyInputHeader').value = this.currentPubky || '';
                    if (this.currentPubky) {
                        this.loadUserMarkers(this.currentPubky, false);
                    }
                }
            }
        });
    }

    // ==================== Session Persistence Methods ====================

    // Save session to localStorage
    saveSession() {
        if (!this.session || !this.currentPubky) {
            return;
        }

        try {
            const sessionData = {
                currentPubky: this.currentPubky,
                timestamp: Date.now(),
                // Store minimal session info - the session object itself may not be serializable
                sessionInfo: {
                    publicKey: this.session.info?.publicKey?.z32() || this.currentPubky,
                    capabilities: this.session.info?.capabilities || []
                }
            };

            localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(sessionData));
            this.log('Session saved to localStorage');
        } catch (error) {
            this.log(`Failed to save session: ${error.message}`);
        }
    }

    // Load session from localStorage
    loadSession() {
        try {
            const stored = localStorage.getItem(this.SESSION_STORAGE_KEY);
            if (!stored) {
                return null;
            }

            const data = JSON.parse(stored);

            // Check if session is too old
            if (Date.now() - data.timestamp > this.SESSION_MAX_AGE) {
                this.log('Stored session expired, removing...');
                localStorage.removeItem(this.SESSION_STORAGE_KEY);
                return null;
            }

            return data;
        } catch (error) {
            this.log(`Failed to load session: ${error.message}`);
            return null;
        }
    }

    // Restore session on app load
    async restoreSession() {
        const sessionData = this.loadSession();

        if (!sessionData) {
            this.log('No stored session found');
            return false;
        }

        this.log(`Restoring session for ${sessionData.currentPubky.substring(0, 16)}...`);
        this.currentPubky = sessionData.currentPubky;

        // Note: The actual session is maintained via cookies from the homeserver
        // We just need to restore the pubky and recreate the session object that
        // uses those cookies for authentication

        // Update UI to show restored state - wait for DOM to be ready
        setTimeout(() => {
            document.getElementById('pubkyInputHeader').value = this.currentPubky;
            this.updateStatus(`Session restored for: ${this.currentPubky.substring(0, 16)}...`, 'connected');

            // Hide auth button since we have a valid session (via cookies)
            document.getElementById('authBtnContainer').classList.add('hidden');

            // Show user menu and friends button
            this.updateUserMenuUI(this.currentPubky);
            document.getElementById('friendsBtn').classList.remove('hidden');

            this.log('Session restored with existing cookies.');

            // Don't load markers yet - wait for pubky to be initialized
            // This will be handled in connect() method
        }, 100);

        return true;
    }

    // Clear saved session
    clearSession() {
        try {
            localStorage.removeItem(this.SESSION_STORAGE_KEY);
            this.log('Session cleared from localStorage');
        } catch (error) {
            this.log(`Failed to clear session: ${error.message}`);
        }
    }

    // Clear all cookies
    clearCookies() {
        if (typeof document !== 'undefined') {
            document.cookie.split(';').forEach((cookie) => {
                const eqPos = cookie.indexOf('=');
                const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
                document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            });
            this.log('Cookies cleared');
        }
    }

    // Toggle user menu dropdown
    toggleUserMenu() {
        const dropdown = document.getElementById('userDropdown');
        dropdown.classList.toggle('hidden');
    }

    // Update user menu UI
    updateUserMenuUI(pubky) {
        const userMenu = document.getElementById('userMenu');
        const userInitials = document.getElementById('userInitials');
        const userPubkyDisplay = document.getElementById('userPubkyDisplay');

        if (pubky) {
            // Show user menu
            userMenu.classList.remove('hidden');

            // Generate jdenticon SVG (size 42 to match avatar size)
            const svg = jdenticon.toSvg(pubky, 42);
            userInitials.innerHTML = svg;

            // Set pubky display (truncated)
            const displayPubky = `${pubky.substring(0, 8)}...${pubky.substring(pubky.length - 8)}`;
            userPubkyDisplay.textContent = displayPubky;
        } else {
            // Hide user menu
            userMenu.classList.add('hidden');
        }

        // Update mobile FAB buttons based on auth state
        this.updateMobileFAB(!!pubky);
    }

    // Update mobile FAB buttons based on authentication state
    updateMobileFAB(isAuthenticated) {
        const mobileFabAdd = document.getElementById('mobileFabAdd');
        const mobileFabSignIn = document.getElementById('mobileFabSignIn');
        const mobileFabStories = document.getElementById('mobileFabStories');

        if (isAuthenticated) {
            // Show add button, hide sign-in button
            mobileFabAdd.style.display = 'flex';
            mobileFabSignIn.style.display = 'none';
            mobileFabStories.style.display = 'flex';
        } else {
            // Hide add button, show sign-in button
            mobileFabAdd.style.display = 'none';
            mobileFabSignIn.style.display = 'flex';
            mobileFabStories.style.display = 'flex';
        }
    }

    // Refresh all data (force reload from network)
    async refreshAllData() {
        // Close dropdown
        document.getElementById('userDropdown').classList.add('hidden');

        if (!this.currentPubky) {
            this.showError('Not authenticated');
            return;
        }

        this.updateStatus('Refreshing all data...', 'testnet');

        // Refresh friends with markers
        await this.loadFriendsWithMarkers(true); // forceRefresh = true

        // Refresh current user's markers if viewing their own
        const currentViewingPubky = document.getElementById('pubkyInputHeader').value.trim() || this.currentPubky;
        if (currentViewingPubky) {
            await this.loadUserMarkers(currentViewingPubky, false, true); // forceRefresh = true
        }

        this.updateStatus('Data refreshed successfully!', 'connected');
    }

    // Clear all caches and reload current view
    async clearCacheAndReload() {
        // Close dropdown
        document.getElementById('userDropdown').classList.add('hidden');

        if (!confirm('This will clear all cached data. Continue?')) {
            return;
        }

        this.updateStatus('Clearing cache...', 'testnet');
        await this.cache.clearAllCaches();

        // Reload data if authenticated
        if (this.currentPubky) {
            await this.refreshAllData();
        } else {
            this.updateStatus('Cache cleared', 'connected');
        }
    }

    // Logout and clear session
    async logout() {
        // Close dropdown
        document.getElementById('userDropdown').classList.add('hidden');

        this.session = null;
        this.currentPubky = null;
        this.clearSession();
        this.clearCookies();

        // Clear all caches
        await this.cache.clearAllCaches();

        // Reset UI
        document.getElementById('authBtnContainer').classList.remove('hidden');
        document.getElementById('submitBtn').disabled = true;
        document.getElementById('friendsBtn').classList.add('hidden');
        document.getElementById('pubkyInputHeader').value = '';
        this.updateUserMenuUI(null);

        // Clear markers
        this.clearMapMarkers();
        document.getElementById('markerList').innerHTML = '<div class="loading">No markers loaded. Connect and add your first story!</div>';

        this.updateStatus('Logged out. Click "Authorize with QR Code" to sign in', 'testnet');
        this.log('Logged out successfully');
    }

    // ==================== End Session Persistence Methods ====================

    // Get color for a friend
    getFriendColor(pubkey) {
        if (!this.friendColorMap.has(pubkey)) {
            const colorIndex = this.friendColorMap.size % this.friendColors.length;
            this.friendColorMap.set(pubkey, this.friendColors[colorIndex]);
        }
        return this.friendColorMap.get(pubkey);
    }

    // Convert pubky:// URL to HTTPS URL for browser compatibility
    convertPubkyUrlToHttps(pubkyUrl, userPubky = null) {
        if (!pubkyUrl) return null;

        // If it's already an HTTP(S) URL, return as-is
        if (pubkyUrl.startsWith('http://') || pubkyUrl.startsWith('https://')) {
            return pubkyUrl;
        }

        // If it's a pubky:// URL, convert to HTTPS
        if (pubkyUrl.startsWith('pubky://')) {
            // pubky://USER_PUBKY/pub/path/to/file.ext
            // becomes https://_pubky.USER_PUBKY/pub/path/to/file.ext
            const withoutProtocol = pubkyUrl.replace('pubky://', '');
            const parts = withoutProtocol.split('/');
            if (parts.length > 0) {
                const extractedPubky = parts[0];
                const path = parts.slice(1).join('/');
                return `https://_pubky.${extractedPubky}/${path}`;
            }
        }

        // If it's a relative path (starts with /pub/) and we have a userPubky, construct full URL
        if (pubkyUrl.startsWith('/pub/') && userPubky) {
            return `https://_pubky.${userPubky}${pubkyUrl}`;
        }

        return null;
    }

    // Initialize resizable sidebar
    initResizableSidebar() {
        const sidebar = document.getElementById('sidebar');
        const resizeHandle = document.getElementById('resizeHandle');

        if (!resizeHandle) {
            console.error('Resize handle not found!');
            return;
        }

        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isResizing = true;
            startX = e.clientX;
            startWidth = sidebar.offsetWidth;
            resizeHandle.classList.add('dragging');
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            e.preventDefault();
            const width = startWidth + (e.clientX - startX);
            const minWidth = parseInt(getComputedStyle(sidebar).minWidth);
            const maxWidth = parseInt(getComputedStyle(sidebar).maxWidth);

            if (width >= minWidth && width <= maxWidth) {
                sidebar.style.width = width + 'px';
                // Trigger map resize
                setTimeout(() => this.map.invalidateSize(), 0);
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                resizeHandle.classList.remove('dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }

    // Load markers from header search
    loadUserMarkersFromHeader() {
        const pubky = document.getElementById('pubkyInputHeader').value.trim();
        if (pubky) {
            this.loadUserMarkers(pubky);
        } else {
            this.showError('Please enter a pubky');
        }
    }

    // Go home (back to user's own markers)
    goHome() {
        if (this.currentPubky) {
            // Load user's own markers and update URL
            document.getElementById('pubkyInputHeader').value = this.currentPubky;
            this.loadUserMarkers(this.currentPubky, true);
            this.log('Returning to your markers');
        } else {
            this.log('Not authenticated yet - cannot return to home view');
        }
    }

    // Initialize Leaflet map
    initMap() {
        // Create map centered on New Orleans, LA
        this.map = L.map('map').setView([29.9511, -90.0715], 13);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(this.map);

        // Add geocoder control with collapsible UI
        const self = this;
        const geocoder = L.Control.geocoder({
            defaultMarkGeocode: false,
            placeholder: 'Search location...',
            errorMessage: 'Location not found',
            position: 'topright',
            collapsed: true,  // Start collapsed with just the icon
            expand: 'touch'   // Expand on click
        })
        .on('markgeocode', function(e) {
            const latlng = e.geocode.center;
            self.map.setView(latlng, 16);
            // Set marker location when searching
            self.setMarkerLocation(latlng.lat, latlng.lng);
            self.log(`Location found: ${e.geocode.name}`);
        })
        .addTo(this.map);

        // Store geocoder reference
        this.geocoder = geocoder;

        // Click handler to place marker
        this.map.on('click', (e) => {
            this.setMarkerLocation(e.latlng.lat, e.latlng.lng);
        });

        this.log('Map initialized with OpenStreetMap and geocoder');
    }

    // Set marker location from map click
    setMarkerLocation(lat, lng) {
        document.getElementById('latitude').value = lat.toFixed(6);
        document.getElementById('longitude').value = lng.toFixed(6);

        // Remove temporary marker if exists
        if (this.tempMarker) {
            this.map.removeLayer(this.tempMarker);
        }

        // Add temporary marker
        this.tempMarker = L.marker([lat, lng], {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            })
        }).addTo(this.map);

        this.currentMarkerLocation = { lat, lng };
        this.log(`Location selected: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }

    // Connect to Pubky
    async connect() {
        try {
            // Wait a moment to see if session was restored
            await new Promise(resolve => setTimeout(resolve, 150));

            const hadSession = !!this.currentPubky;

            if (!hadSession) {
                this.updateStatus('Connecting to Pubky...', 'connected');
            }

            // Initialize Pubky in mainnet mode (for production)
            // For testnet, use: this.pubky = Pubky.testnet();
            this.pubky = new Pubky();

            // Enable debug logging
            try {
                setLogLevel('debug');
                this.log('Debug logging enabled');
            } catch (err) {
                console.warn('Could not enable debug logging:', err);
            }

            if (!hadSession) {
                this.updateStatus('Connected - Click "Authorize with QR Code" to sign in', 'testnet');
                this.log('Connected to Pubky');

                // Show auth button, keep connect button hidden
                document.getElementById('authBtnContainer').classList.remove('hidden');
            } else {
                this.log('Connected to Pubky (session already restored)');

                // Create a minimal session object that uses the existing cookies
                // The cookies handle the actual authentication with the homeserver
                // We create a storage-like object that uses Client.fetch() with credentials: 'include'
                const pubkyPublicKey = PublicKey.from(this.currentPubky);

                // Create a custom storage object that mimics SessionStorage but uses Client.fetch
                const customStorage = {
                    putJson: async (path, data) => {
                        const url = `https://_pubky.${this.currentPubky}${path}`;
                        const response = await this.pubky.client.fetch(url, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data),
                            credentials: 'include'
                        });
                        if (!response.ok) {
                            throw new Error(`Failed to put JSON: ${response.statusText}`);
                        }
                    },
                    putBytes: async (path, bytes) => {
                        const url = `https://_pubky.${this.currentPubky}${path}`;
                        const response = await this.pubky.client.fetch(url, {
                            method: 'PUT',
                            body: bytes,
                            credentials: 'include'
                        });
                        if (!response.ok) {
                            throw new Error(`Failed to put bytes: ${response.statusText}`);
                        }
                    },
                    delete: async (path) => {
                        const url = `https://_pubky.${this.currentPubky}${path}`;
                        const response = await this.pubky.client.fetch(url, {
                            method: 'DELETE',
                            credentials: 'include'
                        });
                        if (!response.ok) {
                            throw new Error(`Failed to delete: ${response.statusText}`);
                        }
                    }
                };

                this.session = {
                    info: {
                        publicKey: pubkyPublicKey,
                        capabilities: ['/pub/geostories.app/:rw']
                    },
                    storage: customStorage
                };

                // Enable the submit button since we have write capabilities via cookies
                document.getElementById('submitBtn').disabled = false;

                // Load friends
                this.loadFriendsWithMarkers();

                // Only auto-load user's own markers if URL doesn't contain a pubky
                const path = window.location.pathname.replace(/^\//, '').trim();
                let pubkyInUrl = path.replace(/^pk:/, '');

                // Check if URL has a valid pubky (and it's not the user's own)
                if (!pubkyInUrl || pubkyInUrl.length <= 40 || !/^[a-z0-9]+$/.test(pubkyInUrl)) {
                    // No valid pubky in URL, load user's own markers
                    this.loadUserMarkers(this.currentPubky);
                }
                // Otherwise, let checkUrlForPubky() handle loading the markers from the URL
            }
        } catch (error) {
            this.showError('Failed to connect: ' + error.message);
            console.error(error);
        }
    }

    // Start Pubky Auth flow (QR/deeplink for existing users)
    async startAuthFlow() {
        try {
            this.updateStatus('Starting authentication flow...', 'testnet');

            // Request write permissions for geostories path
            // Capabilities are passed as a string in the format: "/path/:permissions"
            // :rw = read/write, :r = read only
            const caps = '/pub/geostories.app/:rw';

            this.log('Requesting capabilities: ' + caps);
            this.log('Capabilities string length: ' + caps.length);

            // Note: We're using mainnet mode
            this.log('Using mainnet mode - connecting to production Pubky network');

            // Start auth flow (mainnet uses default relay)
            this.authFlow = this.pubky.startAuthFlow(caps);

            const authUrl = this.authFlow.authorizationUrl;
            this.log(`Authorization URL: ${authUrl}`);

            // Check if we're on mobile and show mobile modal if so
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                this.showMobileAuthModal(authUrl);
            } else {
                // Show QR code and deeplink in sidebar
                this.showAuthUI(authUrl);
            }

            this.updateStatus('Waiting for approval...', 'testnet');

            // Wait for user to approve (on their authenticator app like Pubky Ring)
            try {
                this.session = await this.authFlow.awaitApproval();

                // Get session info (it's a property, not a method)
                this.currentPubky = this.session.info.publicKey.z32();

                this.updateStatus(`Authenticated as: ${this.currentPubky.substring(0, 16)}...`, 'connected');
                this.log(`Authentication approved! Your pubky: ${this.currentPubky}`);
                this.log(`Session has storage access: ${this.session.storage ? 'yes' : 'no'}`);
                this.log(`Session info object: ${JSON.stringify(this.session.info, null, 2)}`);
                this.log(`Session capabilities: ${this.session.info.capabilities ? this.session.info.capabilities.join(', ') : 'UNDEFINED'}`);
                this.log(`Session capabilities type: ${typeof this.session.info.capabilities}`);
                this.log(`Session capabilities is array: ${Array.isArray(this.session.info.capabilities)}`);

                // Check if session has the required capabilities
                // Note: Even if capabilities array is empty, if we have session.storage, we should be able to write
                if (!this.session.storage) {
                    this.hideAuthUI();
                    this.showError('Authentication succeeded but the session has no storage access. This may be a limitation of the current homeserver or your authenticator app. Please try again or contact support.');
                    return;
                }

                if (!this.session.info.capabilities || this.session.info.capabilities.length === 0) {
                    this.log('WARNING: Session capabilities array is empty or undefined, but storage object exists. Proceeding with authentication...');
                }

                this.hideAuthUI();
                this.onAuthenticated();
            } catch (error) {
                this.hideAuthUI();

                // Check if it's a missing homeserver error
                if (error.message && error.message.includes('No HTTPS endpoints found')) {
                    this.showError('Your Pubky account doesn\'t have a homeserver configured yet. Please configure your homeserver in Pubky Ring or your authenticator app before trying to authorize.');
                } else {
                    throw error;
                }
            }
        } catch (error) {
            this.showError('Authentication failed: ' + error.message);
            console.error(error);
        }
    }


    // Called after successful authentication
    onAuthenticated() {
        // Save session to localStorage for persistence
        this.saveSession();

        // Hide auth button, enable submit button
        document.getElementById('authBtnContainer').classList.add('hidden');
        document.getElementById('submitBtn').disabled = false;
        document.getElementById('pubkyInputHeader').value = this.currentPubky;

        // Show user menu and friends button
        this.updateUserMenuUI(this.currentPubky);
        document.getElementById('friendsBtn').classList.remove('hidden');
        this.loadFriendsWithMarkers();

        // Automatically load user's markers
        this.loadUserMarkers(this.currentPubky);
    }

    // Fetch followed users from Pubky with full pagination support
    async getFollowedUsers() {
        if (!this.currentPubky) {
            return [];
        }

        try {
            const followsPath = `pubky://${this.currentPubky}/pub/pubky.app/follows/`;
            this.log(`Fetching follows from: ${followsPath}`);

            const followedUsers = [];
            let cursor = null;
            let batchNumber = 1;
            let totalFetched = 0;

            // Pagination loop: keep fetching until we get fewer results than expected
            // or until we receive an empty batch
            while (true) {
                this.log(`Fetching batch ${batchNumber}${cursor ? ` (cursor: ${cursor.substring(0, 40)}...)` : ''}`);

                // Fetch a batch of follow files, using cursor for pagination
                const followFiles = await this.pubky.publicStorage.list(followsPath, cursor);

                if (!followFiles || followFiles.length === 0) {
                    this.log(`No more follows to fetch (batch ${batchNumber} was empty)`);
                    break;
                }

                this.log(`Batch ${batchNumber}: Retrieved ${followFiles.length} follow files`);
                totalFetched += followFiles.length;

                // Process each follow file in this batch
                for (const followFile of followFiles) {
                    try {
                        // Extract pubky from follow file URL
                        // Follow files are typically at: pubky://{user}/pub/pubky.app/follows/{followed_pubky}
                        // Remove trailing slash if present and split
                        const cleanUrl = followFile.replace(/\/$/, '');
                        const parts = cleanUrl.split('/');
                        const followedPubky = parts[parts.length - 1];

                        // Validate that this looks like a pubky (alphanumeric string of reasonable length)
                        if (followedPubky && followedPubky.length >= 40 && /^[a-z0-9]+$/.test(followedPubky)) {
                            followedUsers.push(followedPubky);
                            this.log(`Found followed user: ${followedPubky}`);
                        } else {
                            this.log(`Skipping invalid pubky: "${followedPubky}" from ${followFile}`);
                        }
                    } catch (err) {
                        this.log(`Failed to parse follow file: ${followFile}`);
                    }
                }

                // Check if we need to continue paginating
                // If we got fewer than 100 results, we've reached the end
                // The SDK may return fewer items if there are no more results
                if (followFiles.length < 100) {
                    this.log(`Reached end of follows (batch ${batchNumber} had ${followFiles.length} items)`);
                    break;
                }

                // Set cursor to the last URL in this batch for next iteration
                cursor = followFiles[followFiles.length - 1];
                batchNumber++;

                // Safety check: prevent infinite loops (max 1000 batches = 100,000 follows)
                if (batchNumber > 1000) {
                    this.log(`⚠️ WARNING: Reached maximum batch limit (1000). Stopping pagination.`);
                    console.warn(`⚠️ Pagination stopped at 1000 batches. Total follows retrieved: ${totalFetched}`);
                    break;
                }
            }

            this.log(`✅ Pagination complete: ${totalFetched} total follow files retrieved across ${batchNumber} batch(es)`);
            this.log(`✅ Found ${followedUsers.length} valid followed users`);

            return followedUsers;
        } catch (error) {
            this.log(`Error fetching followed users: ${error.message}`);
            return [];
        }
    }

    // Get user profile information
    async getProfileInfo(pubky) {
        try {
            // Use the Pubky client's fetch directly with cache-busting to prevent SDK caching
            const cacheBuster = Date.now() + Math.random();
            const profileUrl = `https://_pubky.${pubky}/pub/pubky.app/profile.json?_=${cacheBuster}`;

            const response = await this.pubky.client.fetch(profileUrl, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const profileData = await response.json();

            return {
                name: profileData?.name || null,
                bio: profileData?.bio || null,
                image: profileData?.image || null,
                links: profileData?.links || [],
                pubky: pubky
            };
        } catch (error) {
            return {
                name: null,
                bio: null,
                image: null,
                links: [],
                pubky: pubky
            };
        }
    }

    // Check if a user has GeoStory markers
    async checkUserHasMarkers(pubky) {
        try {
            const markersPath = `pubky://${pubky}/pub/geostories.app/markers/`;
            const files = await this.pubky.publicStorage.list(markersPath);
            const markerFiles = files.filter(f => f.endsWith('.json'));
            return markerFiles.length;
        } catch (error) {
            return 0;
        }
    }

    // Load friends who have GeoStory markers
    async loadFriendsWithMarkers(forceRefresh = false) {
        try {
            const progressBar = document.getElementById('friendsBtnProgress');
            const btnText = document.getElementById('friendsBtnText');

            // Try to load from cache first (unless force refresh)
            if (!forceRefresh) {
                const cached = this.cache.loadFriendsList();
                if (cached && cached.data && cached.data.length > 0) {
                    this.friendsWithMarkers = cached.data;

                    // Update button text immediately
                    if (btnText) {
                        btnText.textContent = `View Friends (${cached.data.length})`;
                    }

                    // Always start background refresh to keep data fresh
                    this.refreshFriendsInBackground();

                    return;
                }
            }

            // No cache or force refresh - load from network
            this.log('Loading friends with GeoStory markers from network...');

            const followedUsers = await this.getFollowedUsers();
            this.log(`Checking ${followedUsers.length} followed users for markers...`);

            const friendsWithMarkers = [];
            const totalUsers = followedUsers.length;

            // Check each followed user for markers and fetch their profile
            for (let i = 0; i < followedUsers.length; i++) {
                const pubky = followedUsers[i];

                // Update progress bar
                const progress = ((i + 1) / totalUsers) * 100;
                if (progressBar) {
                    progressBar.style.width = `${progress}%`;
                }

                const markerCount = await this.checkUserHasMarkers(pubky);
                if (markerCount > 0) {
                    // Fetch profile information
                    const profile = await this.getProfileInfo(pubky);

                    friendsWithMarkers.push({
                        pubky: pubky,
                        markerCount: markerCount,
                        name: profile.name || pubky.substring(0, 16) + '...',
                        bio: profile.bio,
                        image: profile.image
                    });
                }
            }

            this.friendsWithMarkers = friendsWithMarkers;

            // Save to cache
            this.cache.saveFriendsList(friendsWithMarkers);

            // Fade out progress bar after completion
            if (progressBar) {
                // Ensure we're at 100% first
                progressBar.style.width = '100%';

                setTimeout(() => {
                    // Only animate opacity, not width
                    progressBar.style.transition = 'opacity 0.5s ease';
                    progressBar.style.opacity = '0';

                    // Wait for fade to complete (500ms), then reset with no transition
                    setTimeout(() => {
                        // Turn off all transitions before resetting
                        progressBar.style.transition = 'none';
                        // Reset width while opacity is 0 (invisible)
                        progressBar.style.width = '0%';

                        // Wait a frame, then restore opacity and transitions
                        requestAnimationFrame(() => {
                            progressBar.style.opacity = '1';
                            requestAnimationFrame(() => {
                                progressBar.style.transition = 'width 0.3s ease, opacity 0.5s ease';
                            });
                        });
                    }, 550); // Wait slightly longer than the fade duration
                }, 300);
            }

            // Update button text
            if (btnText) {
                btnText.textContent = `View Friends (${friendsWithMarkers.length})`;
            }

            this.log(`Found ${friendsWithMarkers.length} friends with GeoStory markers`);
        } catch (error) {
            this.log(`Error loading friends: ${error.message}`);
            console.error(error);

            // Reset progress bar on error
            const progressBar = document.getElementById('friendsBtnProgress');
            if (progressBar) {
                progressBar.style.transition = 'opacity 0.5s ease';
                progressBar.style.opacity = '0';
                setTimeout(() => {
                    progressBar.style.transition = 'none';
                    progressBar.style.width = '0%';

                    requestAnimationFrame(() => {
                        progressBar.style.opacity = '1';
                        requestAnimationFrame(() => {
                            progressBar.style.transition = 'width 0.3s ease, opacity 0.5s ease';
                        });
                    });
                }, 550);
            }
        }
    }

    // Refresh friends list in the background (silent update)
    async refreshFriendsInBackground() {
        try {
            const followedUsers = await this.getFollowedUsers();
            const friendsWithMarkers = [];

            for (const pubky of followedUsers) {
                const markerCount = await this.checkUserHasMarkers(pubky);
                if (markerCount > 0) {
                    const profile = await this.getProfileInfo(pubky);
                    friendsWithMarkers.push({
                        pubky: pubky,
                        markerCount: markerCount,
                        name: profile.name || pubky.substring(0, 16) + '...',
                        bio: profile.bio,
                        image: profile.image
                    });
                }
            }

            // Update cache silently
            this.cache.saveFriendsList(friendsWithMarkers);
            this.friendsWithMarkers = friendsWithMarkers;

            // Update button text if it changed
            const btnText = document.getElementById('friendsBtnText');
            if (btnText) {
                btnText.textContent = `View Friends (${friendsWithMarkers.length})`;
            }
        } catch (error) {
            // Silent failure for background refresh
        }
    }

    // Show friends modal
    showFriendsModal() {
        const modal = document.getElementById('friendsModal');
        const container = document.getElementById('friendsListContainer');

        if (this.friendsWithMarkers.length === 0) {
            container.innerHTML = '<div class="no-friends">No friends with GeoStories found. Follow users on <a href="https://pubky.app" target="_blank" style="color: #667eea; text-decoration: none; font-weight: 600;">pubky.app</a> to see their stories here!</div>';
        } else {
            // Assign colors to friends
            this.friendsWithMarkers.forEach(friend => {
                this.getFriendColor(friend.pubky);
            });

            container.innerHTML = `
                <button class="show-all-btn" onclick="app.showAllFriendsMarkers()">
                    Show All Friends on Map (${this.friendsWithMarkers.length})
                </button>
                <ul class="friends-list">
                    ${this.friendsWithMarkers.map(friend => {
                        const color = this.getFriendColor(friend.pubky);
                        // Convert pubky:// or relative image URL to HTTPS, passing friend's pubky
                        const imageUrl = this.convertPubkyUrlToHttps(friend.image, friend.pubky);
                        const avatarHtml = imageUrl
                            ? `<img src="${imageUrl}" alt="${friend.name}" class="friend-avatar" onerror="this.style.display='none'">`
                            : '';
                        const bioHtml = friend.bio
                            ? `<div class="friend-bio">${friend.bio}</div>`
                            : '';

                        return `
                            <li class="friend-item" onclick="app.loadFriendMarkers('${friend.pubky}')">
                                <span class="friend-legend" style="background-color: ${color};"></span>
                                ${avatarHtml}
                                <div class="friend-info">
                                    <div class="friend-name">${friend.name}</div>
                                    ${bioHtml}
                                    <div class="friend-pubkey">${friend.pubky}</div>
                                </div>
                                <div class="friend-markers">${friend.markerCount} marker${friend.markerCount !== 1 ? 's' : ''}</div>
                            </li>
                        `;
                    }).join('')}
                </ul>
            `;
        }

        modal.classList.add('active');
    }

    // Close friends modal
    closeFriendsModal() {
        const modal = document.getElementById('friendsModal');
        modal.classList.remove('active');
    }

    // Load markers for a specific friend
    loadFriendMarkers(pubky) {
        this.closeFriendsModal();
        document.getElementById('pubkyInputHeader').value = pubky;
        this.loadUserMarkers(pubky);
    }

    // Highlight a friend in the legend
    highlightFriend(pubkey) {
        // Remove all previous highlights
        document.querySelectorAll('.friend-legend-item').forEach(item => {
            item.style.background = '';
            item.style.transform = '';
            item.style.boxShadow = '';
        });

        // Highlight the selected friend
        const friendId = 'friend-legend-' + pubkey.replace(/[^a-zA-Z0-9]/g, '');
        const friendElement = document.getElementById(friendId);
        if (friendElement) {
            friendElement.style.background = 'linear-gradient(135deg, #f8f9ff 0%, #f0f0ff 100%)';
            friendElement.style.transform = 'translateX(4px)';
            friendElement.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.2)';

            // Scroll to the friend in the list
            friendElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    // Focus on a friend (zoom to their markers)
    focusOnFriend(pubkey) {
        const friendMarkers = [];

        // Find all markers belonging to this friend
        this.markers.forEach((marker, id) => {
            if (marker.author === pubkey) {
                friendMarkers.push([marker.latitude, marker.longitude]);
            }
        });

        if (friendMarkers.length > 0) {
            // Zoom to fit all of this friend's markers
            const bounds = L.latLngBounds(friendMarkers);
            this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });

            // Highlight this friend
            this.highlightFriend(pubkey);
        }
    }

    // Show all friends' markers on the map with different colors
    async showAllFriendsMarkers() {
        this.closeFriendsModal();

        // Reset URL to base domain
        window.history.pushState({ pubky: null }, '', '/');

        try {
            this.updateStatus('Loading all friends\' markers...', 'testnet');

            // Clear existing markers
            this.clearMapMarkers();

            let totalMarkers = 0;
            const allBounds = [];

            // Load markers for each friend
            for (const friend of this.friendsWithMarkers) {
                const color = this.getFriendColor(friend.pubky);
                this.log(`Loading markers for ${friend.name} with color ${color}`);

                try {
                    const markerPath = `pubky://${friend.pubky}/pub/geostories.app/markers/`;
                    const files = await this.pubky.publicStorage.list(markerPath);
                    const jsonFiles = files.filter(f => f.endsWith('.json'));

                    for (const file of jsonFiles) {
                        try {
                            const marker = await this.pubky.publicStorage.getJson(file);
                            this.addMarkerToMap(marker, color);
                            allBounds.push([marker.latitude, marker.longitude]);
                            totalMarkers++;
                        } catch (err) {
                            console.warn(`Failed to load marker: ${file}`, err);
                        }
                    }
                } catch (err) {
                    console.warn(`Failed to load markers for ${friend.name}`, err);
                }
            }

            // Fit map to show all markers
            if (allBounds.length > 0) {
                const bounds = L.latLngBounds(allBounds);
                this.map.fitBounds(bounds, { padding: [50, 50] });
            }

            this.updateStatus(`Loaded ${totalMarkers} markers from ${this.friendsWithMarkers.length} friends`, 'connected', true);
            this.log(`Loaded ${totalMarkers} total markers from all friends`);

            // Update marker list to show friend legend
            document.getElementById('markerList').innerHTML = `
                <div style="text-align: center; padding: 1rem; background: linear-gradient(135deg, #f8f9ff 0%, #f0f0ff 100%); border-radius: 8px; margin-bottom: 1rem;">
                    <strong>Viewing ${totalMarkers} markers from ${this.friendsWithMarkers.length} friends</strong>
                </div>
                <div style="margin-bottom: 1rem;">
                    <h3 style="font-size: 0.9rem; color: #666; margin-bottom: 0.8rem; font-weight: 600;">Friends Legend:</h3>
                    <ul class="friends-list" style="max-height: none;">
                        ${this.friendsWithMarkers.map(friend => {
                            const color = this.getFriendColor(friend.pubky);
                            return `
                                <li class="friend-item friend-legend-item" id="friend-legend-${friend.pubky.replace(/[^a-zA-Z0-9]/g, '')}"
                                    onclick="app.focusOnFriend('${friend.pubky}')"
                                    style="padding: 0.8rem; margin-bottom: 0.6rem; cursor: pointer;">
                                    <span class="friend-legend" style="background-color: ${color};"></span>
                                    <div class="friend-info" style="flex: 1; min-width: 0;">
                                        <div class="friend-name" style="font-size: 0.9rem;">${friend.name}</div>
                                        <div style="font-size: 0.75rem; color: #999;">${friend.markerCount} marker${friend.markerCount !== 1 ? 's' : ''}</div>
                                    </div>
                                </li>
                            `;
                        }).join('')}
                    </ul>
                </div>
            `;
        } catch (error) {
            this.showError('Failed to load friends\' markers: ' + error.message);
            console.error(error);
        }
    }

    // Show QR code and deeplink UI
    showAuthUI(authUrl) {
        const qrContainer = document.getElementById('qrContainer');
        const qrCodeDiv = document.getElementById('qrCode');

        // Show container
        qrContainer.style.display = 'block';

        // Clear any existing QR code
        qrCodeDiv.innerHTML = '';

        // Generate QR code using QRCode.js
        try {
            if (typeof QRCode !== 'undefined') {
                new QRCode(qrCodeDiv, {
                    text: authUrl,
                    width: 250,
                    height: 250,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.H
                });
                this.log('QR code displayed - scan with authenticator app');

                // Make QR code clickable to open deeplink
                qrCodeDiv.style.cursor = 'pointer';
                qrCodeDiv.onclick = () => {
                    // Convert pubky:// URL to pubkyring:// deeplink
                    const deeplinkUrl = 'pubkyring://' + authUrl;
                    window.location.href = deeplinkUrl;
                    this.log(`Opening Pubky Ring with deeplink: ${deeplinkUrl}`);
                };
            } else {
                console.error('QRCode library not loaded');
            }
        } catch (err) {
            console.error('QR code generation error:', err);
        }
    }

    // Show mobile auth modal with QR code
    showMobileAuthModal(authUrl) {
        const modal = document.getElementById('mobileAuthModal');
        const qrCodeDiv = document.getElementById('mobileQrCode');

        // Clear any existing QR code
        qrCodeDiv.innerHTML = '';

        // Generate QR code using QRCode.js
        try {
            if (typeof QRCode !== 'undefined') {
                new QRCode(qrCodeDiv, {
                    text: authUrl,
                    width: 250,
                    height: 250,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.H
                });
                this.log('Mobile QR code displayed - scan with authenticator app');

                // Make QR code clickable to open deeplink
                qrCodeDiv.style.cursor = 'pointer';
                qrCodeDiv.onclick = () => {
                    // Convert pubky:// URL to pubkyring:// deeplink
                    const deeplinkUrl = 'pubkyring://' + authUrl;
                    window.location.href = deeplinkUrl;
                    this.log(`Opening Pubky Ring with deeplink: ${deeplinkUrl}`);
                };
            } else {
                console.error('QRCode library not loaded');
            }
        } catch (err) {
            console.error('QR code generation error:', err);
        }

        // Show modal
        modal.classList.add('active');
    }

    // Close mobile auth modal
    closeMobileAuthModal() {
        const modal = document.getElementById('mobileAuthModal');
        modal.classList.remove('active');
    }

    // Hide QR code UI
    hideAuthUI() {
        document.getElementById('qrContainer').style.display = 'none';

        // Also close mobile modal if it's open
        this.closeMobileAuthModal();
    }

    // Add a new marker/story
    async addMarker(event) {
        event.preventDefault();

        if (!this.session) {
            this.showError('Please authorize first using the QR code');
            return;
        }

        if (!this.currentMarkerLocation) {
            this.showError('Please click on the map to select a location');
            return;
        }

        try {
            const title = document.getElementById('title').value;
            const description = document.getElementById('description').value;
            const photoFile = document.getElementById('photo').files[0];

            // Check if we're editing an existing marker
            if (this.editingMarkerId) {
                await this.updateMarker(this.editingMarkerId, title, description, photoFile);
                return;
            }

            this.updateStatus('Saving your story...', 'testnet');

            // Generate unique marker ID
            const markerId = `marker-${Date.now()}`;
            const photoFilename = photoFile ? `photo-${Date.now()}.jpg` : null;

            // Create marker object
            const marker = {
                id: markerId,
                latitude: this.currentMarkerLocation.lat,
                longitude: this.currentMarkerLocation.lng,
                title: title,
                description: description,
                timestamp: Date.now(),
                photos: photoFilename ? [photoFilename] : [],
                author: this.currentPubky
            };

            // Save marker metadata
            this.log(`Attempting to save marker to: /pub/geostories.app/markers/${markerId}.json`);
            this.log(`Using session for user: ${this.currentPubky}`);

            try {
                await this.session.storage.putJson(
                    `/pub/geostories.app/markers/${markerId}.json`,
                    marker
                );
                this.log(`Marker metadata saved: ${markerId}`);
            } catch (storageError) {
                this.log(`Storage error details: ${JSON.stringify(storageError)}`);
                this.log(`Error name: ${storageError.name}, message: ${storageError.message}`);
                if (storageError.data) {
                    this.log(`Error data: ${JSON.stringify(storageError.data)}`);
                }
                throw storageError;
            }

            // Upload photo if provided
            if (photoFile) {
                const photoBytes = await this.fileToUint8Array(photoFile);
                await this.session.storage.putBytes(
                    `/pub/geostories.app/markers/${markerId}/${photoFilename}`,
                    photoBytes
                );
                this.log(`Photo uploaded: ${photoFilename}`);
            }

            this.updateStatus('Story saved successfully!', 'connected');
            this.showSuccess('Your story has been added to the map!');

            // Invalidate cache for current user
            await this.cache.clearMarkersForUser(this.currentPubky);

            // Add marker to map
            this.addMarkerToMap(marker);

            // Reset form
            document.getElementById('markerForm').reset();
            document.getElementById('photoPreview').style.display = 'none';
            if (this.tempMarker) {
                this.map.removeLayer(this.tempMarker);
            }
            this.currentMarkerLocation = null;

            // Switch to view tab
            this.switchTab('view');
        } catch (error) {
            this.showError('Failed to save story: ' + error.message);
            console.error(error);
        }
    }

    // Load markers for a specific user
    async loadUserMarkers(pubky = null, updateUrl = true, forceRefresh = false) {
        const targetPubky = pubky || document.getElementById('pubkyInput').value.trim();

        if (!targetPubky) {
            this.showError('Please enter a pubky to view their markers');
            return;
        }

        // Strip 'pk:' prefix if present
        const cleanPubky = targetPubky.replace(/^pk:/, '');

        // Update URL to reflect the pubky being viewed
        if (updateUrl) {
            this.updateUrlForPubky(cleanPubky);
        }

        try {
            // Try to load from cache first (unless force refresh)
            if (!forceRefresh) {
                const cached = await this.cache.loadMarkers(cleanPubky);
                if (cached && cached.data && cached.data.length > 0) {
                    // Clear existing markers from map
                    this.clearMapMarkers();

                    // Add cached markers to map
                    cached.data.forEach(marker => this.addMarkerToMap(marker));

                    // Display marker list
                    this.displayMarkerList(cached.data);

                    this.updateStatus(`Loaded ${cached.data.length} marker${cached.data.length !== 1 ? 's' : ''}`, 'connected', true);

                    // Fit map to show all markers
                    if (cached.data.length > 0) {
                        const bounds = L.latLngBounds(cached.data.map(m => [m.latitude, m.longitude]));
                        this.map.fitBounds(bounds, { padding: [50, 50] });
                    }

                    // Always start background refresh to keep data fresh
                    this.refreshMarkersInBackground(cleanPubky);

                    return;
                }
            }

            // No cache or force refresh - load from network
            this.updateStatus(`Loading markers for ${cleanPubky.substring(0, 16)}...`, 'testnet');
            document.getElementById('markerList').innerHTML = '<div class="loading">Loading markers...</div>';

            // Clear existing markers from map
            this.clearMapMarkers();

            // List all marker files
            const markerPath = `pubky://${cleanPubky}/pub/geostories.app/markers/`;
            const files = await this.pubky.publicStorage.list(markerPath);

            const jsonFiles = files.filter(f => f.endsWith('.json'));

            if (jsonFiles.length === 0) {
                document.getElementById('markerList').innerHTML = '<div class="loading">No markers found for this user.</div>';
                this.updateStatus('No markers found', 'testnet');
                // Cache empty result to avoid repeated failed requests
                await this.cache.saveMarkers(cleanPubky, []);
                return;
            }

            this.log(`Found ${jsonFiles.length} markers`);

            // Load each marker
            const markers = [];
            for (const file of jsonFiles) {
                try {
                    const marker = await this.pubky.publicStorage.getJson(file);
                    markers.push(marker);
                    this.addMarkerToMap(marker);
                } catch (err) {
                    console.warn(`Failed to load marker: ${file}`, err);
                }
            }

            // Save to cache
            await this.cache.saveMarkers(cleanPubky, markers);

            this.displayMarkerList(markers);
            this.updateStatus(`Loaded ${markers.length} marker${markers.length !== 1 ? 's' : ''}`, 'connected', true);

            // Fit map to show all markers
            if (markers.length > 0) {
                const bounds = L.latLngBounds(markers.map(m => [m.latitude, m.longitude]));
                this.map.fitBounds(bounds, { padding: [50, 50] });
            }
        } catch (error) {
            this.showError('Failed to load markers: ' + error.message);
            console.error(error);
            document.getElementById('markerList').innerHTML = '<div class="error">Failed to load markers</div>';
        }
    }

    // Refresh markers in the background (silent update)
    async refreshMarkersInBackground(pubky) {
        try {
            const markerPath = `pubky://${pubky}/pub/geostories.app/markers/`;
            const files = await this.pubky.publicStorage.list(markerPath);
            const jsonFiles = files.filter(f => f.endsWith('.json'));

            const markers = [];
            for (const file of jsonFiles) {
                try {
                    const marker = await this.pubky.publicStorage.getJson(file);
                    markers.push(marker);
                } catch (err) {
                    console.warn(`Failed to load marker in background: ${file}`, err);
                }
            }

            // Update cache silently
            await this.cache.saveMarkers(pubky, markers);
        } catch (error) {
            // Silent failure for background refresh
        }
    }

    // Add marker to Leaflet map with optional custom color
    addMarkerToMap(marker, customColor = null) {
        // Determine marker color - default to violet to match app theme
        let iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png';

        if (customColor) {
            // Use colored marker - map hex colors to available marker colors
            const colorMapping = {
                '#FF6B6B': 'red',
                '#4ECDC4': 'green',
                '#45B7D1': 'blue',
                '#FFA07A': 'orange',
                '#98D8C8': 'green',
                '#F7B731': 'gold',
                '#5F27CD': 'violet',
                '#00D2D3': 'blue',
                '#FF9FF3': 'red',
                '#54A0FF': 'blue',
                '#48DBFB': 'blue',
                '#1DD1A1': 'green',
                '#F368E0': 'red',
                '#FF9F43': 'orange',
                '#00B894': 'green',
                '#6C5CE7': 'violet',
                '#FD79A8': 'red',
                '#FDCB6E': 'gold',
                '#74B9FF': 'blue',
                '#A29BFE': 'violet'
            };

            const markerColor = colorMapping[customColor] || 'violet';
            iconUrl = `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${markerColor}.png`;
        }

        // Create marker icon
        const markerIcon = L.icon({
            iconUrl: iconUrl,
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        // Create marker layer
        const markerLayer = L.marker([marker.latitude, marker.longitude], {
            icon: markerIcon
        }).addTo(this.map);

        // Check if current user owns this marker
        const isOwned = this.currentPubky && marker.author === this.currentPubky;

        // Get friend info if this is a friend's marker
        const friend = this.friendsWithMarkers.find(f => f.pubky === marker.author);
        const authorName = friend ? friend.name : (marker.author === this.currentPubky ? 'You' : marker.author.substring(0, 16) + '...');
        const colorIndicator = customColor ? `<span class="friend-legend" style="background-color: ${customColor}; margin-left: 0.5rem;"></span>` : '';

        // Create popup content with optional edit/delete buttons
        const actionsHtml = isOwned ? `
            <div class="popup-actions">
                <button class="edit-btn" onclick="app.editMarker('${marker.id}')">Edit</button>
                <button class="delete-btn" onclick="app.deleteMarker('${marker.id}')">Delete</button>
            </div>
        ` : '';

        const popupContent = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;">
                <h3 style="margin: 0 0 0.5rem 0; font-size: 1rem; font-weight: 600; color: #333; line-height: 1.3; overflow-wrap: break-word;">${marker.title}</h3>
                <p style="margin: 0 0 0.5rem 0; font-size: 0.85rem; color: #555; line-height: 1.5; overflow-wrap: break-word;">${marker.description}</p>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem; padding: 0.5rem 0 0.2rem 0; border-top: 1px solid #e8e8f0;">
                    <small style="color: #667eea; font-size: 0.8rem; font-weight: 600;">
                        ${authorName}
                    </small>
                    ${colorIndicator}
                </div>
                <small style="color: #999; font-size: 0.75rem; display: block;">
                    ${new Date(marker.timestamp).toLocaleDateString()}
                </small>
                ${actionsHtml}
            </div>
        `;

        markerLayer.bindPopup(popupContent);

        // Add click handler to highlight friend in legend
        if (friend) {
            markerLayer.on('click', () => {
                this.highlightFriend(marker.author);
            });
        }

        this.markerLayers.set(marker.id, markerLayer);
        this.markers.set(marker.id, marker);
    }

    // Display marker list in sidebar
    displayMarkerList(markers) {
        const listEl = document.getElementById('markerList');

        if (markers.length === 0) {
            listEl.innerHTML = '<div class="loading">No markers found</div>';
            return;
        }

        // Sort by timestamp (newest first)
        markers.sort((a, b) => b.timestamp - a.timestamp);

        listEl.innerHTML = `
            <ul class="marker-list">
                ${markers.map(m => {
                    const isOwned = this.currentPubky && m.author === this.currentPubky;
                    const actionsHtml = isOwned ? `
                        <div class="marker-actions">
                            <button class="edit-btn" onclick="event.stopPropagation(); app.editMarker('${m.id}')">Edit</button>
                            <button class="delete-btn" onclick="event.stopPropagation(); app.deleteMarker('${m.id}')">Delete</button>
                        </div>
                    ` : '';

                    return `
                        <li class="marker-item"
                            onclick="app.focusMarker('${m.id}')"
                            onmouseenter="app.highlightMapMarker('${m.id}', true)"
                            onmouseleave="app.highlightMapMarker('${m.id}', false)">
                            <div class="marker-title">${m.title}</div>
                            <div class="marker-desc">${m.description}</div>
                            <div class="marker-meta">
                                ${new Date(m.timestamp).toLocaleDateString()}
                            </div>
                            ${actionsHtml}
                        </li>
                    `;
                }).join('')}
            </ul>
        `;
    }

    // Highlight or unhighlight a marker on the map
    highlightMapMarker(markerId, highlight) {
        const markerLayer = this.markerLayers.get(markerId);

        if (!markerLayer) {
            console.log('No marker layer found for:', markerId);
            return;
        }

        // Get the marker's DOM element
        const markerElement = markerLayer.getElement();

        if (!markerElement) {
            console.log('No DOM element found for marker:', markerId);
            return;
        }

        if (highlight) {
            // Add CSS class for instant visual feedback
            markerElement.classList.add('marker-highlighted');
            markerLayer.setZIndexOffset(1000); // Bring to front
            console.log('Highlighted marker:', markerId, markerElement);
        } else {
            // Remove highlight class
            markerElement.classList.remove('marker-highlighted');
            markerLayer.setZIndexOffset(0); // Reset z-index
        }
    }

    // Focus on a specific marker on the map
    focusMarker(markerId) {
        const marker = this.markers.get(markerId);
        const markerLayer = this.markerLayers.get(markerId);

        if (marker && markerLayer) {
            this.map.setView([marker.latitude, marker.longitude], 15);
            markerLayer.openPopup();
        }
    }

    // Clear all markers from map
    clearMapMarkers() {
        this.markerLayers.forEach(layer => this.map.removeLayer(layer));
        this.markerLayers.clear();
        this.markers.clear();
    }

    // Cancel editing a marker
    cancelEdit() {
        // Reset form
        document.getElementById('markerForm').reset();
        document.getElementById('photoPreview').style.display = 'none';

        // Remove temp marker
        if (this.tempMarker) {
            this.map.removeLayer(this.tempMarker);
        }
        this.currentMarkerLocation = null;

        // Reset button text and remove cancel button
        const submitBtn = document.getElementById('submitBtn');
        const formButtons = document.getElementById('formButtons');
        submitBtn.textContent = 'Add Story to Map';

        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.remove();
            formButtons.classList.remove('two-buttons');
        }

        // Clear editing state
        this.editingMarkerId = null;

        // Switch to view tab
        this.switchTab('view');

        this.log('Editing cancelled');
    }

    // Edit a marker
    editMarker(markerId) {
        const marker = this.markers.get(markerId);

        if (!marker) {
            this.showError('Marker not found');
            return;
        }

        // Check ownership
        if (marker.author !== this.currentPubky) {
            this.showError('You can only edit your own markers');
            return;
        }

        // Store the marker ID being edited
        this.editingMarkerId = markerId;

        // Switch to add tab
        this.switchTab('add');

        // Pre-populate the form
        document.getElementById('title').value = marker.title;
        document.getElementById('description').value = marker.description;
        document.getElementById('latitude').value = marker.latitude;
        document.getElementById('longitude').value = marker.longitude;

        // Set the marker location
        this.currentMarkerLocation = { lat: marker.latitude, lng: marker.longitude };

        // Show the marker on the map
        if (this.tempMarker) {
            this.map.removeLayer(this.tempMarker);
        }
        this.tempMarker = L.marker([marker.latitude, marker.longitude], {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            })
        }).addTo(this.map);

        // Center map on marker
        this.map.setView([marker.latitude, marker.longitude], 15);

        // Update submit button text and show cancel button
        const submitBtn = document.getElementById('submitBtn');
        const formButtons = document.getElementById('formButtons');
        submitBtn.textContent = 'Update Story';

        // Show cancel button if not already shown
        if (!document.getElementById('cancelBtn')) {
            formButtons.classList.add('two-buttons');
            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.id = 'cancelBtn';
            cancelBtn.className = 'cancel-btn';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.onclick = () => this.cancelEdit();
            formButtons.appendChild(cancelBtn);
        }

        // On mobile, show the sidebar with the edit form
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            const backdrop = document.getElementById('mobileBackdrop');
            const header = document.querySelector('header');

            // Hide header on mobile to maximize map view
            header.classList.add('mobile-hidden');

            // Show sidebar with backdrop
            sidebar.classList.add('show');
            backdrop.classList.add('active');
        }

        this.log(`Editing marker: ${markerId}`);
    }

    // Update an existing marker
    async updateMarker(markerId, title, description, photoFile) {
        const marker = this.markers.get(markerId);

        if (!marker) {
            this.showError('Marker not found');
            return;
        }

        try {
            this.updateStatus('Updating your story...', 'testnet');

            // Update marker object
            const updatedMarker = {
                ...marker,
                title: title,
                description: description,
                latitude: this.currentMarkerLocation.lat,
                longitude: this.currentMarkerLocation.lng,
            };

            // If new photo provided, update photos array
            if (photoFile) {
                const photoFilename = `photo-${Date.now()}.jpg`;
                updatedMarker.photos = [photoFilename];

                // Upload new photo
                const photoBytes = await this.fileToUint8Array(photoFile);
                await this.session.storage.putBytes(
                    `/pub/geostories.app/markers/${markerId}/${photoFilename}`,
                    photoBytes
                );
                this.log(`Photo uploaded: ${photoFilename}`);

                // Delete old photos
                if (marker.photos && marker.photos.length > 0) {
                    for (const photo of marker.photos) {
                        try {
                            await this.session.storage.delete(`/pub/geostories.app/markers/${markerId}/${photo}`);
                            this.log(`Deleted old photo: ${photo}`);
                        } catch (err) {
                            console.warn(`Failed to delete old photo: ${photo}`, err);
                        }
                    }
                }
            }

            // Save updated marker metadata
            await this.session.storage.putJson(
                `/pub/geostories.app/markers/${markerId}.json`,
                updatedMarker
            );
            this.log(`Marker updated: ${markerId}`);

            this.updateStatus('Story updated successfully!', 'connected');
            this.showSuccess('Your story has been updated!');

            // Invalidate cache for current user
            await this.cache.clearMarkersForUser(this.currentPubky);

            // Update the marker in memory
            this.markers.set(markerId, updatedMarker);

            // Remove old marker from map
            const oldMarkerLayer = this.markerLayers.get(markerId);
            if (oldMarkerLayer) {
                this.map.removeLayer(oldMarkerLayer);
                this.markerLayers.delete(markerId);
            }

            // Add updated marker to map
            this.addMarkerToMap(updatedMarker);

            // Reset form and editing state
            document.getElementById('markerForm').reset();
            document.getElementById('photoPreview').style.display = 'none';
            const submitBtn = document.getElementById('submitBtn');
            const formButtons = document.getElementById('formButtons');
            submitBtn.textContent = 'Add Story to Map';

            // Remove cancel button
            const cancelBtn = document.getElementById('cancelBtn');
            if (cancelBtn) {
                cancelBtn.remove();
                formButtons.classList.remove('two-buttons');
            }

            if (this.tempMarker) {
                this.map.removeLayer(this.tempMarker);
            }
            this.currentMarkerLocation = null;
            this.editingMarkerId = null;

            // Refresh the marker list
            await this.loadUserMarkers(this.currentPubky);

            // Switch to view tab
            this.switchTab('view');
        } catch (error) {
            this.showError('Failed to update story: ' + error.message);
            console.error(error);
        }
    }

    // Delete a marker
    async deleteMarker(markerId) {
        const marker = this.markers.get(markerId);

        if (!marker) {
            this.showError('Marker not found');
            return;
        }

        // Check ownership
        if (marker.author !== this.currentPubky) {
            this.showError('You can only delete your own markers');
            return;
        }

        if (!confirm(`Are you sure you want to delete "${marker.title}"?`)) {
            return;
        }

        try {
            this.updateStatus('Deleting marker...', 'testnet');

            // Delete marker metadata file
            await this.session.storage.delete(`/pub/geostories.app/markers/${markerId}.json`);
            this.log(`Deleted marker: ${markerId}`);

            // Delete photo if it exists
            if (marker.photos && marker.photos.length > 0) {
                for (const photo of marker.photos) {
                    try {
                        await this.session.storage.delete(`/pub/geostories.app/markers/${markerId}/${photo}`);
                        this.log(`Deleted photo: ${photo}`);
                    } catch (err) {
                        console.warn(`Failed to delete photo: ${photo}`, err);
                    }
                }
            }

            // Invalidate cache for current user
            await this.cache.clearMarkersForUser(this.currentPubky);

            // Remove from map
            const markerLayer = this.markerLayers.get(markerId);
            if (markerLayer) {
                this.map.removeLayer(markerLayer);
                this.markerLayers.delete(markerId);
            }
            this.markers.delete(markerId);

            // Refresh the marker list
            await this.loadUserMarkers(this.currentPubky);

            this.updateStatus('Marker deleted successfully', 'connected');
            this.showSuccess('Marker deleted!');
        } catch (error) {
            this.showError('Failed to delete marker: ' + error.message);
            console.error(error);
        }
    }

    // Switch between tabs
    switchTab(tab) {
        const tabs = ['add', 'view'];
        tabs.forEach(t => {
            document.getElementById(`${t}Tab`).classList.toggle('active', t === tab);
        });

        document.querySelectorAll('.tab-btn').forEach((btn, idx) => {
            btn.classList.toggle('active', tabs[idx] === tab);
        });
    }

    // Preview photo before upload
    previewPhoto(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('photoPreview');
                preview.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }

    // Helper: Convert file to Uint8Array
    async fileToUint8Array(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(new Uint8Array(reader.result));
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    // Update status display
    updateStatus(message, type, compact = false) {
        const statusEl = document.getElementById('status');
        statusEl.textContent = message;
        statusEl.className = `status ${type}${compact ? ' compact' : ''}`;
    }

    // Show error message
    showError(message) {
        alert('Error: ' + message);
        this.log('ERROR: ' + message);
    }

    // Show success message
    showSuccess(message) {
        this.log('SUCCESS: ' + message);
    }

    // Log to console
    log(message) {
        console.log(`[GeoStories] ${message}`);
    }
}

// Initialize app
window.app = new GeoStoriesApp();
console.log('GeoStories app initialized');
