<div align="center">

# 🗺️ GeoStories

**Decentralized story mapping powered by Pubky**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Pubky](https://img.shields.io/badge/Built%20with-Pubky-blue)](https://pubky.org)
[![Leaflet](https://img.shields.io/badge/Maps-Leaflet-green)](https://leafletjs.com/)

*Share your stories, pin your memories, explore the world through others' eyes*

[🌐 **Visit geostories.app**](https://geostories.app)

[Features](#-features) • [Quick Start](#-quick-start) • [Usage](#-usage) • [Technical Details](#-technical-details) • [Deployment](#-deployment)

</div>

---

A fully decentralized geo-mapping application where users can place markers on a map and write stories with photos. Built with **Pubky SDK** for decentralized identity and storage, **Leaflet/OpenStreetMap** for map visualization, and designed to work on desktop and mobile devices.

## ✨ Features

<table>
<tr>
<td width="50%">

### 🎯 Core Features
- 📍 **Interactive Map** - Click anywhere to place story markers
- 📸 **Photo Support** - Upload photos with your stories
- ✏️ **Edit & Delete** - Manage your own markers
- 🔍 **Location Search** - Geocoder to find places quickly
- 📱 **Mobile Responsive** - Works beautifully on all devices

</td>
<td width="50%">

### 🤝 Social Features
- 👥 **Friends Integration** - See your friends' markers on map
- 🎨 **Color-Coded Markers** - Each friend has a unique color
- 🔗 **URL Sharing** - Share direct links to your markers
- 🔓 **Public Discovery** - Explore any Pubky user's stories
- 💾 **Session Persistence** - Stay logged in

</td>
</tr>
</table>

### 🔐 Powered by Pubky
- 🆔 **Decentralized Identity** - Own your data
- 🔒 **QR Code Auth** - Secure authentication with Pubky Ring
- 🌐 **Mainnet Ready** - Production Pubky network
- ♾️ **Censorship Resistant** - Your stories, forever
- 🚫 **No Backend** - Fully client-side decentralized app

## 🏗️ Architecture

<details>
<summary><b>Data Structure</b> (click to expand)</summary>

```
/pub/geostories.app/
  └── markers/
      ├── marker-<timestamp>.json      # Marker metadata
      └── marker-<timestamp>/
          └── photo-<timestamp>.jpg    # Photo data
```

**Each marker stores:**
- 🌍 GPS coordinates (latitude, longitude)
- 📝 Title and description
- ⏱️ Timestamp
- 👤 Author's pubky
- 🖼️ Photo references (if any)

</details>

## 🚀 Quick Start

### Prerequisites

- **Node.js** v20+ (for package management)
- **Modern browser** (Chrome, Firefox, Safari, Edge with ES6+ support)

### Installation

```bash
# 1️⃣ Clone the repository
git clone <repo-url>
cd geostories

# 2️⃣ Install dependencies
npm install

# 3️⃣ Start the development server
npm run dev
```

🎉 Open your browser to `http://localhost:3000` and start exploring!

### Production Build

```bash
npm run build
npm run preview
```

## 📖 Usage

### 🔐 Getting Started

1. **Connect to Pubky** - Click "Connect to Pubky" to initialize the SDK
2. **Authorize with QR Code** - Scan the QR code with the Pubky Ring mobile app (or click the link on mobile)
3. **Start Creating** - Click on the map to place markers and share your stories!

> **Session Persistence:** Your session is saved for 30 days - no need to re-authenticate every time!

---

### 📝 Creating & Managing Stories

**Add a Story:**
1. Click anywhere on the map (or use the search bar to find a location)
2. Fill in the title, description, and optionally upload a photo
3. Click "Add Story to Map"

**Edit/Delete:**
- Click on your own markers to see Edit and Delete buttons
- Make changes and save, or remove stories you no longer want

### 👥 Social Features

**View Friends' Markers:**
- Your Pubky friends automatically appear in the sidebar
- Each friend gets a unique color on the map
- Click a friend's name to highlight their markers

**Explore Other Users:**
- Paste any Pubky user's public key to load their markers
- Share your markers by sharing: `geostories.app/your-pubky-here`

**Map Interaction:**
- Click markers to see story details
- Click sidebar items to center the map on that marker
- Hover over markers for animations and highlights

## 🔧 Technical Details

<details>
<summary><b>Pubky SDK Integration</b></summary>

### Authentication Flow

```javascript
// Request write permissions for geostories path
const caps = Capabilities.builder()
    .readWrite('/pub/geostories.app/')
    .finish();

// Start auth flow (generates QR code URL)
const authFlow = pubky.startAuthFlow(caps);
const authUrl = authFlow.authorizationUrl();

// Wait for user approval from their authenticator app
const session = await authFlow.awaitApproval();
```

### Storage API

```javascript
// Write marker metadata (JSON)
await session.storage.putJson(
  '/pub/geostories.app/markers/marker-123.json',
  markerData
);

// Write photo (binary)
await session.storage.putBytes(
  '/pub/geostories.app/markers/marker-123/photo.jpg',
  photoBytes
);

// Read public data from any user
const marker = await pubky.publicStorage.getJson(
  `pubky<public-key>/pub/geostories.app/markers/marker-123.json`
);
```

### Discovery

```javascript
// List all markers for a user
const files = await pubky.publicStorage.list(
  `pubky<public-key>/pub/geostories.app/markers/`
);
```

</details>

<details>
<summary><b>Map Integration</b></summary>

Using **Leaflet.js** with **OpenStreetMap** tiles:

```javascript
const map = L.map('map').setView([37.7749, -122.4194], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
```

</details>

## 📁 File Structure

```
geostories/
├── 📄 index.html          # Main UI with embedded CSS (1785 lines)
├── 📜 app.js              # Application logic with Pubky integration (1905 lines)
├── ⚙️ vite.config.js      # Vite build configuration
├── 📦 package.json        # Dependencies and scripts
└── 📖 README.md           # This file
```

**Tech Stack:**
- **Frontend:** Vanilla JavaScript (ES6 modules), HTML5, CSS3
- **Maps:** Leaflet.js v1.9.4 + OpenStreetMap tiles
- **Identity:** @synonymdev/pubky v0.6.0-rc.6
- **Build:** Vite v7.1.11
- **Utils:** jdenticon (avatars), qrcodejs (QR codes), leaflet-control-geocoder (search)

## 🚢 Deployment

The app is **fully static** and can be hosted anywhere:

- **GitHub Pages** (current deployment)
- **Netlify** / **Vercel** / **Cloudflare Pages**
- Any static file hosting service

**Build for production:**
```bash
npm run build
```

The `dist/` folder contains the production-ready build.

**Production Features:**
- ✅ Runs on **Pubky mainnet** (production network)
- ✅ **30-day session persistence** via secure cookies
- ✅ **No backend required** - fully client-side
- ✅ **Mobile responsive** with touch-optimized controls
- ✅ Users authenticate with their own Pubky homeserver

## 🔍 Troubleshooting

**Authentication Issues:**
- Make sure you have the Pubky Ring app installed on your mobile device
- Try refreshing the page and reconnecting
- Check browser console for detailed error messages

**Marker Loading Issues:**
- Verify the pubky (public key) is in correct z32 format
- Ensure the user has created markers on GeoStories
- Try refreshing the page

**Photo Upload Issues:**
- Keep images under 10MB for best performance
- Supported formats: JPEG, PNG, GIF
- Ensure your browser supports FileReader API (all modern browsers do)

**Browser Compatibility:**
- Requires a modern browser with ES6+ support
- Best experience on Chrome, Firefox, Safari, or Edge
- Mobile browsers fully supported

## 🛠️ Development

**Local Development:**
```bash
npm run dev  # Start Vite dev server on localhost:3000
```

**Debugging:**
- Open browser DevTools console to see detailed logs
- All Pubky operations are logged with `[GeoStories]` prefix
- Check Network tab for storage API calls

**Code Structure:**
- `index.html` - UI layout and embedded CSS
- `app.js` - Main application logic, Pubky integration, map controls
- Pure vanilla JavaScript - no framework dependencies
- Modular design with clear separation of concerns

## 🚀 Future Enhancements

**Potential Features:**
- 🖼️ Photo galleries (multiple photos per marker)
- 🏷️ Marker categories and tags
- 🔍 Advanced search and filter
- 💬 Comments/replies on markers
- 📦 Automatic photo compression
- 🗂️ Marker clustering for dense areas
- 📥 Export markers as GeoJSON
- 🌙 Dark mode theme
- 📊 Analytics dashboard

---

## 📚 Resources

- **Pubky Core:** [github.com/pubky/pubky-core](https://github.com/pubky/pubky-core)
- **Pubky SDK Docs:** [docs.rs/pubky](https://docs.rs/pubky)
- **Leaflet Docs:** [leafletjs.com](https://leafletjs.com/)
- **OpenStreetMap:** [openstreetmap.org](https://www.openstreetmap.org/)

## 🙏 Built With

- **@synonymdev/pubky** - Decentralized identity and storage
- **Leaflet.js** - Interactive map library
- **OpenStreetMap** - Map tiles and geodata
- **Vite** - Lightning-fast build tool

---

<div align="center">

## 📜 License

MIT License - See LICENSE file for details

**Made for the Pubky Hackathon**

[⬆ Back to Top](#-geostories)

</div>
