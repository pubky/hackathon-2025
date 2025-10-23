ConsentKy
Lightweight cryptographic proof of mutual consent

Demo: https://consentky2-cqo9.bolt.host/

ConsentKy is a decentralized consent management application that creates verifiable, time-bound proof of mutual agreement between two parties. Built on Pubky protocol for decentralized identity and Bolt Database for session coordination.

What It Does
ConsentKy enables two people to:

Create cryptographically signed consent sessions with time-bound validity
Generate tamper-proof canonical consent objects with verifiable hashes
Store consent proofs on personal homeservers (decentralized storage via Pubky)


Each consent session includes:
Cryptographic signatures from both parties
Time window with start/end timestamps
Canonical hash of the agreement
Optional metadata and tags
Backup on both parties' homeservers

Why It Matters
Traditional consent tracking relies on centralized systems that can be manipulated, lost, or compromised. ConsentKy provides:

Immutability: Cryptographic signatures prevent tampering
Decentralization: Each party stores their own copy on personal homeservers
Verifiability: Anyone with the proof can verify authenticity
Time-bound: Clear start and end times prevent misuse
Privacy: No central authority controls your consent records
Portability: Standards-based proofs work across platforms
Setup & Run
Prerequisites
Node.js 18+
npm or yarn
Bolt Database account (for session coordination)
Pubky-compatible wallet app
Environment Variables
Create a .env file in the root:


VITE_Bolt Database_URL=your_Bolt Database_url
VITE_Bolt Database_ANON_KEY=your_Bolt Database_anon_key
Installation

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
Database Setup
The app uses Bolt Database with the following tables:

consent_sessions: Main consent session data
session_tags: User-defined tags for sessions
user_profiles: User metadata and usernames
pending_joins: Temporary session join invitations
session_messages: Encrypted messages between participants
See supabase/ directory for migration scripts.

Architecture
High-Level Flow

User A                          User B
  |                               |
  | 1. Create Session             |
  |----> Bolt Database DB              |
  |                               |
  | 2. Generate QR/Share Link     |
  |------------------------------>| 3. Scan/Click
  |                               |
  |                     4. Authenticate via Pubky
  |                               |
  | 5. Both sign canonical object |
  |<----------------------------->|
  |                               |
  | 6. Session becomes ACTIVE     |
  |<====> Bolt Database (Real-time) <===>|
  |                               |
  | 7. Save to homeserver         |
  |----> Pubky Homeserver         |
  |                               |----> Pubky Homeserver
  |                               |
  | 8. Time window expires        |
  |<====> Session EXPIRED <======>|
Technology Stack
Frontend

React 18 + TypeScript
Vite (build tool)
Tailwind CSS (styling)
Lucide React (icons)
Authentication & Storage

Pubky SDK (@synonymdev/pubky) - Decentralized identity and homeserver storage
libsodium-wrappers - Cryptographic operations
QR codes for mobile wallet authentication
Backend Services

Bolt Database - PostgreSQL database with real-time subscriptions
HTTP Relay - Pubky authentication relay (httprelay.pubky.app)
Key Components
Core Libraries (src/lib/)

pubky.ts: Pubky client wrapper, authentication, homeserver writes
crypto.ts: Cryptographic signing and verification
consent.ts: Canonical object creation and hashing
homeserverStorage.ts: Agreement backup logic with retry
supabase.ts: Database client configuration
Authentication Flow (src/contexts/)

AuthContext.tsx: Pubky authentication state management
SessionContext.tsx: Active consent session lifecycle
Main Screens (src/components/)

LandingPage.tsx: Unauthenticated home
HomeScreen.tsx: Post-login dashboard
CreateSession.tsx: Initiate new consent session
ShareSession.tsx: Generate QR/link for partner
JoinSession.tsx: Join via QR/link
ReviewAndSign.tsx: Sign canonical consent object
ActiveSession.tsx: Live session monitoring
MySessionsScreen.tsx: Browse all sessions
ProofDetails.tsx: View full cryptographic proof
Data Flow
Session Creation: Person A creates session → stored in Bolt Database with pending status
Invitation: QR code/link generated with session ID
Authentication: Both parties authenticate via Pubky (scan QR with wallet app)
Signing: Both parties sign canonical consent object (cryptographic hash)
Activation: Session becomes active when both signatures present
Homeserver Backup: Each party optionally saves to their Pubky homeserver
Real-time Sync: Bolt Database real-time subscriptions keep UI synchronized
Expiration: Session automatically expires when time window ends
Security Model
No password storage: Authentication via Pubky's cryptographic keys
Client-side signing: Private keys never leave user's device
Canonical hashing: SHA-256 hash of sorted JSON ensures integrity
Time-bound: Sessions have explicit validity windows
Decentralized proof: Each party has independent copy on personal homeserver
No revocation: By design - consent is time-bound, not revocable
Development

# Type checking
npm run typecheck

# Linting
npm run lint
License
MIT
