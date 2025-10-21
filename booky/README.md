# Booky - Pubky Bookmark Sync Extension

Booky is a browser extension that syncs your bookmarks using the Pubky protocol. It provides decentralized bookmark storage and synchronization across devices using Pubky homeservers.

## Features

- **Automatic Key Generation**: Generates a Pubky keypair on first use
- **Two-Way Sync**: Syncs bookmarks bidirectionally between browser and homeserver
- **Read-Only Monitoring**: Monitor and sync bookmarks from other Pubky users (read-only)
- **Real-Time Updates**: Automatically syncs changes every 20 seconds during development
- **Cross-Device Sync**: Sync bookmarks across multiple devices using the same key
- **Conflict Resolution**: Timestamp-based conflict resolution (newest wins)

## Architecture

### Components

1. **Key Management**: Generates and securely stores Ed25519 keypairs using Pubky SDK
2. **Storage Manager**: Manages extension storage for keys, monitored pubkeys, and sync status
3. **Offscreen Document** (Chrome only): Runs Pubky SDK operations that require WASM/eval in a separate context with relaxed CSP
4. **Offscreen Client**: Proxy that communicates between service worker and offscreen document
5. **Homeserver Client**: Handles communication with Pubky homeservers via offscreen client
6. **Bookmark Sync Engine**: Monitors bookmark changes and syncs with homeserver
7. **Background Service**: Coordinates periodic sync and handles messages from UI
8. **Popup UI**: Simple interface for setup and managing monitored pubkeys

### Chrome Manifest V3 Architecture

Chrome's strict Content Security Policy (CSP) doesn't allow eval/WASM in service workers. To work around this:
- The Pubky SDK runs in an **offscreen document** (`offscreen.html` + `offscreen.js`)
- The offscreen document has its own CSP that allows `unsafe-eval` and `wasm-unsafe-eval`
- The service worker communicates with the offscreen document via `chrome.runtime.sendMessage()`
- All SDK operations (key generation, signup, data operations) are proxied through this architecture

**CSP in offscreen.html:**
```html
<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'; object-src 'self'">
```

### Data Format

Bookmarks are stored on the homeserver at path `<pubky>/public/booky/` with the following format:

```json
{
  "url": "https://example.com",
  "title": "Example Site",
  "tags": [],
  "timestamp": 1234567890,
  "id": "bookmark_id"
}
```

### Folder Structure

- Main folder: `pub_abcdefg` (first 7 chars of your pubkey) - Two-way sync
- Monitored folders: `pub_hijklmn` (first 7 chars of monitored pubkeys) - Read-only sync

## Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Chrome or Firefox browser

### Getting an Invite Code

To use the staging homeserver, you need an invite code. Generate one using:

```bash
curl -X GET \
"https://admin.homeserver.staging.pubky.app/generate_signup_token" \
  -H "X-Admin-Password: voyage tuition cabin arm stock guitar soon salute"
```

### Installation

1. Clone the repository:
```bash
cd hackathon-lugano-2025/booky
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:

For Chrome:
```bash
npm run build:chrome
```

For Firefox:
```bash
npm run build:firefox
```

For both:
```bash
npm run build:all
```

4. Load the extension in your browser:

**Chrome:**
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/chrome` folder

**Firefox:**
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Navigate to `dist/firefox` and select `manifest.json`

## Usage

### First Time Setup

1. Click the Booky icon in your browser toolbar
2. Enter your invite code (optional, required for staging homeserver)
3. Click "Setup Booky"
4. Your pubkey and folder name will be displayed

### Syncing Bookmarks

1. Add bookmarks to the `pub_abcdefg` folder (where `abcdefg` is the first 7 chars of your pubkey)
2. Bookmarks are automatically synced to the homeserver every 20 seconds
3. Changes from other devices are pulled automatically

### Monitoring Other Pubkeys

1. Click the Booky icon
2. In the "Monitor Other Pubkeys" section, enter a pubkey
3. Click "Add"
4. A new folder `pub_hijklmn` will be created with their bookmarks (read-only)

### Manual Sync

Click the "Sync Now" button in the popup to trigger an immediate sync.

## Development

### Watch Mode

For development with auto-rebuild:

```bash
npm run watch:chrome
# or
npm run watch:firefox
```

### Project Structure

```
booky/
├── package.json
├── webpack.config.js
├── README.md
├── LICENSE
├── src/
│   ├── background/
│   │   └── background.js          # Background service worker
│   ├── crypto/
│   │   └── keyManager.js          # Key generation and management
│   ├── offscreen/                 # Chrome only - for CSP workaround
│   │   ├── offscreen.html         # Offscreen document HTML
│   │   └── offscreen.js           # Runs Pubky SDK operations
│   ├── pubky/
│   │   ├── homeserverClient.js    # Homeserver client wrapper
│   │   └── offscreenClient.js     # Proxy for offscreen communication
│   ├── sync/
│   │   └── bookmarkSync.js        # Bookmark sync logic
│   ├── storage/
│   │   └── storageManager.js      # Browser storage wrapper
│   ├── ui/
│   │   ├── popup.html             # Popup UI
│   │   ├── popup.js               # Popup logic
│   │   └── popup.css              # Popup styles
│   └── utils/
│       ├── browserCompat.js       # Cross-browser compatibility
│       └── logger.js              # Logging utility
├── icons/
│   └── icon.svg                   # Extension icon
├── manifest.v3.json               # Chrome manifest (with offscreen permission)
├── manifest.v2.json               # Firefox manifest
└── dist/                          # Build output
    ├── chrome/                    # Includes offscreen.html/js
    └── firefox/
```

## Technical Details

### Pubky SDK Integration

The extension uses `@synonymdev/pubky` SDK version 0.6.0-rc.6 for:
- Key generation (`Pubky.generateKeypair()`)
- User signup (`client.signup()`)
- Session management (`client.signin()`, `client.session()`)
- Data operations (`client.put()`, `client.get()`, `client.list()`)
- Homeserver resolution (`Pubky.getHomeserverOf()`)

### Security

- Private keys are encrypted using Web Crypto API before storage
- Session cookies are managed automatically by the Pubky SDK
- All data is stored locally in browser storage
- Public bookmarks are stored at `<pubky>/public/booky/`

### Sync Algorithm

1. Get all bookmarks from monitored folders
2. Fetch data from homeserver at path `<pubky>/public/booky/`
3. For main folder: compare timestamps, merge changes bidirectionally
4. For monitored folders: only update local bookmarks from homeserver
5. Update browser bookmarks and/or homeserver accordingly

### Conflict Resolution

When conflicts occur (same bookmark modified in multiple places):
- Compare timestamps
- Newest timestamp wins
- Update both local and remote to match the newest version

## Browser Support

- Chrome (Manifest V3)
- Firefox (Manifest V2)

## License

MIT License - see LICENSE file for details

## Contributing

This project was created for the Pubky Internal Hackathon Lugano 2025.

## Resources

- [Pubky Core SDK](https://github.com/pubky/pubky-core)
- [Pubky NPM Package](https://www.npmjs.com/package/@synonymdev/pubky)
- [JavaScript Examples](https://github.com/pubky/pubky-core/tree/refactor/breaking-pubky-client/examples/javascript)
- [Staging Homeserver](https://admin.homeserver.staging.pubky.app)

