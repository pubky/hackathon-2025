# Pubky Desktop App - UI Mockups

Since this is a GUI application that requires a display server, here are detailed descriptions of what each screen looks like:

## Screen 1: Initialization State

```
╔═══════════════════════════════════════════════════════════╗
║               Pubky Desktop Login                         ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║                                                           ║
║                         ⏳                                ║
║                                                           ║
║              Initializing authentication...              ║
║                                                           ║
║                                                           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

**Description:**
- Window size: 600x700 pixels
- Centered spinner animation
- Gray text below spinner
- Clean white background
- Appears for ~1-2 seconds during initialization

## Screen 2: QR Code Display (Main Login Screen)

```
╔═══════════════════════════════════════════════════════════╗
║               Pubky Desktop Login                         ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║      Scan this QR code with your Pubky app to login:     ║
║                                                           ║
║                 ┌───────────────┐                         ║
║                 │ ███ █ ██ ███ │                         ║
║                 │ █ █ █ █  █ █ │                         ║
║                 │ ███ ███ ████ │                         ║
║                 │  ██ █ █ ██ █ │                         ║
║                 │ ███ █ ██ ███ │                         ║
║                 └───────────────┘                         ║
║                                                           ║
║                   Or use this URL:                        ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │ pubkyauth://httprelay.pubky.app/link/abc123...     │ ║
║  │ ?capabilities=...&secret=...                        │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                           ║
║              Waiting for authentication... ⏳            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

**Description:**
- QR code (scaled 2x, max 300x300px to fit window)
- Black and white QR code with sharp edges
- Scrollable text box showing the full authorization URL
- Spinner animation at the bottom indicating waiting state
- URL is selectable and copyable
- QR code encodes the complete `pubkyauth://` URL
- QR code properly fits within the 600x700px window boundaries

**Technical Details:**
- QR code contains: relay URL, capabilities, and client secret
- Background polling happens every few seconds
- UI remains responsive during polling

## Screen 3: Success Screen (Authenticated)

```
╔═══════════════════════════════════════════════════════════╗
║               Pubky Desktop Login                         ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║             ✓ Authentication Successful!                 ║
║                                                           ║
║                   Your Public Key:                        ║
║                                                           ║
║  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ ║
║  ┃ y7mf6t9k3n5j2p8w1x4qz9v8c6b5d4a3f2g1h0i9j8k7l6m5  ┃ ║
║  ┃ n4o3p2q1r0s9t8u7v6w5x4y3z2a1b0c9d8e7f6g5h4i3j2k1  ┃ ║
║  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ ║
║                                                           ║
║                                                           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

**Description:**
- Green checkmark (✓) indicating success
- "Authentication Successful!" message
- Light gray background box containing the public key
- Public key displayed in monospace font
- Key is selectable and copyable
- Scrollable if the key is very long

**Key Format:**
- Base32 encoded public key
- Typically 52 characters long
- Starts with the user's unique identifier

## Screen 4: Error State

```
╔═══════════════════════════════════════════════════════════╗
║               Pubky Desktop Login                         ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║                        Error                              ║
║                                                           ║
║        Failed to initialize: Network connection error     ║
║                                                           ║
║        Please check your internet connection and          ║
║        restart the application.                           ║
║                                                           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

**Description:**
- "Error" text in red color
- Detailed error message below
- Clean, minimal layout
- User should restart the application to retry

## UI Colors

- **Background**: White (#FFFFFF)
- **Text**: Dark gray (#202020)
- **Spinner**: Default egui blue
- **Success checkmark**: Green (#00AA00)
- **Error text**: Red (#FF0000)
- **Public key box**: Light gray (#F0F0F0)
- **QR code**: Pure black/white (#000000/#FFFFFF)

## Fonts

- **Headings**: Default egui proportional font, bold
- **Body text**: Default egui proportional font
- **Public key**: Monospace font for easy reading
- **URL**: Proportional font, selectable

## Interactions

- **QR Code**: Non-interactive, display only
- **URL text box**: Selectable, copyable
- **Public key text box**: Selectable, copyable
- **Window**: Resizable (minimum 600x700)

## Animations

- **Spinner**: Rotating animation during waiting states
- **State transitions**: Instant (no animation)
- **UI updates**: ~60 FPS for smooth rendering

## Accessibility

- High contrast between text and background
- Large, readable fonts
- Clear visual hierarchy
- Keyboard navigation supported (egui default)
