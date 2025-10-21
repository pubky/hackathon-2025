# Pubky Desktop App

A desktop application built with Rust, egui v0.33, and pubky v0.6.0-rc.6 that provides a simple and secure login interface using QR codes.

## Features

- **QR Code Login**: Display a QR code for easy authentication with Pubky-compatible mobile apps
- **Real-time Authentication**: Automatically polls for user approval and updates the UI
- **Public Key Display**: Shows the authenticated user's public key
- **Cross-platform**: Built with egui for native desktop support on Windows, macOS, and Linux

## Quick Start

### Prerequisites
- Rust toolchain (1.90.0 or later)
- System dependencies for GUI (OpenGL libraries)

### Building

```bash
# Development build
cargo build

# Release build (optimized)
cargo build --release
```

### Running

```bash
# Run development version
cargo run

# Run release version
cargo run --release

# Or use the demo script
./run_demo.sh
```

## How It Works

1. The application initializes a Pubky authentication flow
2. A QR code is generated from the authorization URL
3. Users scan the QR code with their Pubky mobile app
4. The app polls the relay server for approval
5. Once authenticated, the user's public key is displayed

## Testing

```bash
cargo test
```

## Technologies Used

- **eframe/egui v0.33**: Cross-platform GUI framework
- **pubky v0.6.0-rc.6**: Decentralized identity and authentication
- **qrcode v0.14**: QR code generation
- **tokio**: Async runtime
- **image v0.25**: Image processing

## Documentation

See [USAGE.md](USAGE.md) for detailed usage instructions.

## License

See [LICENSE](LICENSE) for details.
