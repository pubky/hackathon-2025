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

## Architecture overview

Pubky Live Vote is a single-page Vite + React application that talks directly to the Pubky JavaScript SDK. The architecture is intentionally thin—everything runs client-side so hackathon organisers can deploy the app as static files while still benefiting from secure storage through Pubky.

### Core modules

| Layer | Key modules | Responsibilities |
| --- | --- | --- |
| **UI** | `src/components/*` | Presentation components for ballot entry, leaderboard, navigation chrome, and responsive layouts. Each component receives state via props or React context to keep rendering predictable. |
| **State & context** | `src/context/AuthContext`, `src/context/ProjectsContext` | Centralises session, project catalogue, and submission state. Auth context exposes the connected Pubky identity plus loading/error states. Projects context provides rubric metadata, cached ballots, and helper actions. |
| **Services** | `src/services/pubkyClient`, `src/services/offlineQueue`, `src/services/sampleData` | Wrap Pubky SDK calls (login, ballot CRUD, summary fetch) and isolate network logic. The offline queue abstracts localStorage persistence, while sample data powers the preview mode used before the homeserver is reachable. |
| **Types & utilities** | `src/types`, `src/services/scoring` | Declare the shared interfaces for ballots, rubric weights, and leaderboard entries, plus pure functions to calculate weighted scores and tie-breakers. |

### Runtime data flow

1. **Bootstrap** – when the app mounts, it loads configuration from `window.__PUBKY_CONFIG__`, instantiates the Pubky SDK (or the mocked client), and pulls the current project list plus any cached ballots.
2. **Authentication** – the login dialog triggers a Pubky Ring session. Auth context resolves to either a verified Pubky identity or the offline mock identity so users can continue testing.
3. **Ballot capture** – the ballot form emits updates into local React state; on submit the service layer signs and uploads the payload to `pubky-live-vote/ballots/<public-key>.json` via the SDK. When offline, submissions append to the queue and display a pending badge.
4. **Leaderboard refresh** – a polling effect queries `summary.json`. When the summary endpoint fails, the app composes the leaderboard from cached ballots and marks the data source accordingly.
5. **Feedback loop** – successful submissions rehydrate the local cache, prune duplicates, and broadcast the update to any open tabs using the browser Broadcast Channel API so multiple screens stay in sync.

### Build & deployment pipeline

1. Developers run `npm run dev` for a hot-reloading Vite server with the mock Pubky client prewired.
2. `npm run build` performs a production build and TypeScript type checking, emitting static assets in `dist/`.
3. GitHub Actions (see [`.github/workflows/deploy-pages.yml`](../.github/workflows/deploy-pages.yml)) runs on pushes to `main`, builds the app, and publishes `dist/` to GitHub Pages with a correctly scoped base path.
4. Organisers can host the same `dist/` bundle on any static hosting provider; no server-side component is required beyond the Pubky homeserver that stores ballots.

## Voting lifecycle

The diagram below summarises a typical voter session:

1. **Discovery** – voter opens the published URL from a QR code or shared link.
2. **Join** – the app requests a login session; the voter scans the Pubky Ring QR code or, if unavailable, uses the mock client to simulate approval.
3. **Score** – projects load with rubric sliders, comment fields, and quick tags. The UI validates input ranges and blocks submission until every mandatory criterion is rated.
4. **Submit** – once the user presses **Submit ballot**, the app signs the payload and attempts to push it to the configured homeserver. Any failure routes the ballot into the offline queue.
5. **Sync** – the background worker retries queued ballots whenever connectivity returns and posts toast notifications for each success.
6. **Leaderboard** – after a ballot lands, the leaderboard refreshes to show the updated totals and ranking with context on the data source (summary vs. locally aggregated ballots).

## Development process & friction log

During the hackathon build we followed a tight feedback loop:

1. **Prototype UX** – sketched the mobile-first ballot flow in Figma, then stubbed the React components using static data.
2. **Integrate Pubky** – wired the SDK into the mock client first, swapped to the staging homeserver, and validated auth + storage flows end-to-end.
3. **Harden offline mode** – implemented the queue, background flush, and conflict resolution before styling polish to guarantee ballot resilience.
4. **Polish & QA** – ran through event-day scripts (onboarding voters, resetting ballots, viewing standings) with organisers to ensure the copy and state transitions made sense.

### Friction points

- **Invitation code handling** – staging homeserver login required manual token generation, slowing down new device onboarding. Mitigation: added the CLI helper (`npm run signup`) and documented the admin endpoint in this README.
- **SDK typings lag** – the 0.6.0-rc.6 TypeScript definitions were missing a few optional fields (notably around summary responses), forcing us to extend types locally. We upstreamed the feedback to the Pubky core team.
- **Mobile keyboard overlap** – iOS Safari covered the lower rubric sliders during testing. The fix was to implement viewport-height safe area CSS variables and adjust scroll anchoring in the ballot component.
- **Leaderboard polling limits** – aggressive polling tripped rate limiting on early builds. We introduced exponential backoff and a circuit breaker that switches to local aggregation after repeated failures.

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

## Deploying to GitHub Pages

A ready-to-use GitHub Actions workflow lives in [`.github/workflows/deploy-pages.yml`](../.github/workflows/deploy-pages.yml). It builds the Vite app, packages the static output from `pubky-live-vote/dist`, and publishes it to the repository’s GitHub Pages environment. To go live:

1. Push the workflow to your fork or repository and make sure the default branch is `main` (or update the workflow trigger).
2. In **Settings → Pages**, select **GitHub Actions** as the source.
3. Merge to `main` or run the workflow manually from the **Actions** tab. The job automatically sets the correct base path so the app works from `https://<username>.github.io/<repo>/` on both desktop and mobile browsers.

If you need to serve the site from a custom subdirectory, override the `VITE_BASE_PATH` environment variable in the **Build static site** step of the workflow. For custom domains, configure the CNAME record in the repository settings after the first deployment completes.

## License

This project is released under the MIT license. See [LICENSE](./LICENSE).
