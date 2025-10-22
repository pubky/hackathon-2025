# Pubky Live Vote

Pubky Live Vote is a responsive hackathon voting interface that uses the Pubky JavaScript SDK for authentication and ballot storage. It is designed for 1–2 day events where dozens of voters need to authenticate quickly, score projects across the official rubric, provide feedback, and watch the leaderboard update in real time.

## Features

- **Pubky authentication** – voters connect through the Pubky Ring QR flow. A mock client is bundled for offline development and falls back automatically if the SDK is unavailable.
- **Mobile and desktop friendly UI** – adaptive layout for phones, tablets, and desktops with high-contrast styling.
- **Full rubric support** – sliders for Complexity, Creativity / Practicality, Team Presentation, and Feedback Quality plus a readiness toggle.
- **Popular vote ranking** – drag-friendly ranking board with explicit self-vote blocking once the voter selects their own project.
- **Feedback & tagging** – comment box and quick tag helper per project.
- **Offline cache** – ballots queue in local storage whenever the network is down and flush automatically once connectivity is restored.
- **Live leaderboard** – polls the Pubky homeserver summary (or aggregates ballots directly) every 10 seconds, showing the voter count and data source for transparency.

## Getting started

### Prerequisites

- Node.js 18+
- npm 9+

Optional: install the Pubky homeserver testnet tools if you want to target a local network.

### Installation

```bash
cd pubky-live-vote
npm install
```

> **Tip:** if you prefer to stay at the repository root, the workspace wrapper also lets you run `npm run install:app` to install
> dependencies without changing directories.

### Development

```bash
npm run dev
```

From the repository root you can use `npm run dev` as well—the root `package.json` proxies the command to the app workspace.

The dev server runs on [http://localhost:5173](http://localhost:5173). The first load will automatically request a Pubky Ring session and render the QR code. Scan it with the Ring mobile app to authenticate. Without the app you can use the bundled mock client, which auto-accepts the login after a short delay.

For convenience, local development now serves a baked-in leaderboard snapshot and ballot history from `/pubky-live-vote/`. This means the leaderboard and activity panels light up immediately without relying on the remote staging homeserver. If you prefer to point at a live homeserver you can still override the target using the configuration snippet below.

### Production build

```bash
npm run build
```

The build command compiles the Vite project and performs type checking.

### Homeserver signup & authenticator helpers

Two convenience scripts wrap the Pubky SDK for command-line flows that require a recovery file:

```bash
# Create or update a user on the target homeserver using a recovery file
npm run signup -- <homeserver_pubky> </path/to/recovery_file> [invitation_code] [--testnet]

# Approve a pubkyauth:// login request with a recovery file
npm run authenticator -- </path/to/recovery_file> "<AUTH_URL>" [--testnet] [--homeserver <pk>]
```

Both commands prompt for the recovery passphrase. The `--testnet` flag switches to the SDK testnet instance and skips the invitation requirement.

### Configuring the homeserver

By default the client tries to create a Pubky SDK instance against the staging homeserver and falls back to the local mock client. To explicitly point at a local testnet you can expose `window.__PUBKY_CONFIG__` before the bundle loads:

```html
<script>
  window.__PUBKY_CONFIG__ = {
    homeserverUrl: 'http://localhost:8080',
    homeserverPublicKey: 'your-testnet-key'
  };
</script>
```

Then, update the login flow to trust ballots signed by that server. All ballots are stored under `pubky-live-vote/ballots/<public-key>.json`.

### Folder structure

```
src/
  components/     # UI components and styling
  context/        # Auth and project state providers
  services/       # Pubky client adapter, offline queue, sample data
  types/          # Shared TypeScript types
```

## Testing the offline queue

1. Open the dev server and authenticate.
2. Fill out a few scores and press **Submit ballot**.
3. Toggle your browser to offline mode and make more changes.
4. Submit again. The queue will store the ballot locally.
5. Reconnect; the app auto-flushes pending ballots and refreshes the submission timestamp.

## Live leaderboard data flow

1. The client requests `pubky-live-vote/summary.json` from the configured homeserver every 10 seconds. If the summary is offline, it falls back to `pubky-live-vote/ballots/index.json` and aggregates the raw ballots locally.
2. Each project’s component scores are normalised to a 0–100 range, the official weights are applied, and tie-ready totals are produced. The UI highlights whether the snapshot came from the summary file, raw ballots, or a local preview.
3. The table updates in place without a page reload, giving organisers and participants a reliable view of standings as ballots from up to 24 voters (and beyond) land during the event.

## License

This project is released under the MIT license. See [LICENSE](./LICENSE).
