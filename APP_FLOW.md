# Pubky Desktop App - Application Flow

## Visual Flow

```
┌─────────────────────────────────────────────┐
│         Pubky Desktop Login                 │
├─────────────────────────────────────────────┤
│                                             │
│  State 1: Initializing                      │
│  ┌───────────────────────────────────────┐  │
│  │        ⏳ Spinner                      │  │
│  │  Initializing authentication...        │  │
│  └───────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘

         ↓ (Auth flow initialized)

┌─────────────────────────────────────────────┐
│         Pubky Desktop Login                 │
├─────────────────────────────────────────────┤
│                                             │
│  State 2: Showing QR Code                   │
│  ┌───────────────────────────────────────┐  │
│  │  Scan this QR code with your          │  │
│  │  Pubky app to login:                  │  │
│  │                                       │  │
│  │       ┌─────────────────┐            │  │
│  │       │ ███ ██ ███ ██  │            │  │
│  │       │ █ █ ██ █ █ ██  │            │  │
│  │       │ ███ ██ ███ ██  │            │  │
│  │       │ ██ ███ ██ ███  │  (QR Code) │  │
│  │       │ ███ ██ ███ ██  │            │  │
│  │       │ █ █ ██ █ █ ██  │            │  │
│  │       │ ███ ██ ███ ██  │            │  │
│  │       └─────────────────┘            │  │
│  │                                       │  │
│  │  Or use this URL:                     │  │
│  │  ┌─────────────────────────────────┐ │  │
│  │  │ pubkyauth://...                 │ │  │
│  │  └─────────────────────────────────┘ │  │
│  │                                       │  │
│  │  Waiting for authentication... ⏳     │  │
│  └───────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘

         ↓ (User scans QR and approves)

┌─────────────────────────────────────────────┐
│         Pubky Desktop Login                 │
├─────────────────────────────────────────────┤
│                                             │
│  State 3: Authenticated                     │
│  ┌───────────────────────────────────────┐  │
│  │   ✓ Authentication Successful!        │  │
│  │                                       │  │
│  │   Your Public Key:                    │  │
│  │   ┌─────────────────────────────────┐ │  │
│  │   │ y7mf6t9k3n5j2p8w1x4q...         │ │  │
│  │   │ (Full public key displayed)      │ │  │
│  │   └─────────────────────────────────┘ │  │
│  └───────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

## State Machine

```
   START
     |
     v
[Initializing] ──────────┐
     |                   │
     | (Init Success)    | (Init Error)
     v                   v
[ShowingQR]          [Error State]
     |
     | (User Authenticates)
     v
[Authenticated]
```

## Technical Details

### State 1: Initializing
- Creates a Pubky client instance
- Initializes authentication flow with default capabilities
- Spawns background thread for async operations

### State 2: ShowingQR
- Generates QR code from `pubkyauth://` URL
- Displays QR code scaled 4x for better visibility
- Shows authorization URL as text alternative
- Polls relay server in background for user approval
- Displays spinner to indicate waiting state

### State 3: Authenticated
- Receives authentication token from relay
- Establishes session with Pubky homeserver
- Extracts and displays user's public key
- Public key shown in monospace font for easy copying

### Error Handling
If any step fails:
- Displays error message in red
- Shows specific error details
- User can restart application to retry

## Background Processing

The app uses a dedicated thread with Tokio runtime to handle:
1. Authentication flow initialization
2. Long-polling the relay server
3. Session establishment
4. State updates

This keeps the UI responsive while waiting for user authentication.
