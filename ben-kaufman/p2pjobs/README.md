# P2PJobs

Decentralized job board using Pubky for identity and storage. Employers publish jobs and candidates apply using their own keys. Data lives under each user’s Pubky namespace; the local server indexes peers for fast reads.

## Stack

- React + TypeScript + Vite + TailwindCSS
- Pubky SDK `@synonymdev/pubky@0.6.0-rc.6`
- Node.js Express indexer (reads peers, aggregates jobs/profiles/applications)

## Data model (Pubky paths)

- Jobs list: `pubky://<pubkey>/pub/p2pjobs/jobs.json` (array)
- Profile: `pubky://<pubkey>/pub/p2pjobs/profile.json`
- Applications: pointers stored in indexer; application bodies written by applicants to their own Pubky space

## Requirements

- Node.js 20.19+ (recommended 22.12+)
- npm (or yarn/pnpm)

## Setup

1) Install deps

```bash
npm install
```

2) Configure environment

Copy `.env.example` to `.env.local` (or set shell env vars) and review:

Frontend (Vite):

- `VITE_REGISTRY_URL` – local indexer URL (default `http://localhost:8787`)
- `VITE_PUBKY_HOME_PK` – homeserver public key (staging)
- `VITE_PUBKY_ADMIN_ENDPOINT` – signup token endpoint (staging)
- `VITE_PUBKY_ADMIN_PASSWORD` – admin password to generate signup tokens (staging)

Server (Indexer):

- `PORT` – default `8787`
- `PUBKY_HOME_HOST` – optional fallback homeserver origin for reads (e.g. `https://homeserver.staging.pubky.app`)

3) Run dev

```bash
# Terminal A: indexer
npm run server

# Terminal B: frontend
npm run dev
```

Open `http://localhost:5173`.

## How it works

- Signup generates an Ed25519 keypair and creates a Pubky user (staging uses an admin-generated invite token).
- Posting a job writes only your jobs array to your `pub/p2pjobs/jobs.json`.
- The server indexer reads jobs from all registered pubkeys and exposes `GET /jobs` for the UI.
- Profiles are read via `GET /profiles/:pk` with no-cache to avoid stale profile data.
- Applications: applicants write to their own Pubky, then submit a pointer to `POST /applications`; employers read via `GET /applications?employer=<pk>`.

## Server API

- `POST /pubkeys` body `{ pubkey, host? }` – register a user (and optional homeserver host)
- `GET /jobs` – aggregated list from all registered pubkeys
- `GET /profiles/:pk` – user profile (no cache)
- `POST /applications` – register application pointer `{ id, employerPubkey, applicantPubkey, url, jobId?, jobTitle? }`
- `GET /applications?employer=<pk>` – list employer’s incoming applications
- `PATCH /applications/:id` – update application status `{ status }`

## Troubleshooting

- Wrong passphrase when restoring: ensure the same passphrase used to create the recovery file.
- 401 No session cookie: retry signup/signin; ensure browser allows cookies.
- PKDNS/PKARR resolution issues: set `PUBKY_HOME_HOST` on the server as a fallback, or use testnet.
- Stale reads: server and profile endpoints set `no-store` and add cache-busting query params.

## Security

- Do not commit invite tokens, passwords, or recovery files.
- Keys are generated client-side; users are responsible for backups via recovery file/base64 secret.

## License

MIT
