# Pubky Desktop App - Usage Guide

## Overview
This is a desktop application built with Rust, egui v0.33, and pubky v0.6.0-rc.6 that provides a simple login interface using QR codes.

## Features
1. **Login QR Code Display**: The app shows a QR code that users can scan with their Pubky-compatible mobile app
2. **User Authentication**: Handles the authentication flow automatically
3. **Public Key Display**: Once authenticated, displays the user's public key

## Building the Application

### Prerequisites
- Rust toolchain (1.90.0 or later)
- System dependencies for egui (OpenGL libraries)

### Build Commands
```bash
# Development build
cargo build

# Release build (optimized)
cargo build --release
```

## Running the Application

```bash
# Run development version
cargo run

# Run release version
cargo run --release
```

## How It Works

1. **Initialization**: When the app starts, it initializes a Pubky authentication flow
2. **QR Code Display**: A QR code is generated from the authorization URL
3. **Waiting for Authentication**: The app polls the Pubky relay server waiting for user approval
4. **Success**: Once authenticated, the user's public key is displayed

## Architecture

The application uses:
- **eframe/egui**: For the cross-platform GUI
- **pubky**: For the authentication and identity management
- **qrcode**: For generating QR codes
- **tokio**: For async runtime
- **image**: For image processing

## Authentication Flow

The app implements the Pubky auth flow as documented:
1. Creates a new Pubky client
2. Starts an authentication flow with default capabilities
3. Generates a QR code from the authorization URL
4. Polls the relay server for user approval
5. Retrieves the session and displays the public key

## Notes

- The application uses default Pubky mainnet relays
- Authentication polling happens in a background thread
- The UI remains responsive during authentication
- The QR code is scaled 4x for better visibility
