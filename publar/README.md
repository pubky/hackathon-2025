# Publar

A desktop application for visualizing, testing, and debugging Pubky network topologies, but most importantly to make development on top of Pubky easier.

## What It Does

Publar (Pubky + Polar) is a visual testing and simulation tool for the Pubky protocol that lets you:

- **Create and manage local testnet nodes**: Spin up multiple homeservers and clients with a single click
- **Visualize network topology**: See homeservers, clients, and their connections in an interactive force-directed graph
- **Test data operations**: Connect clients to homeservers, write data, and read it back with real-time feedback
- **Run automated scenarios**: Execute pre-built test sequences to validate network behavior under various conditions
- **Debug network issues**: Monitor all operations through a detailed event log with timestamps

Think of it as a development sandbox where you can experiment with Pubky networks before deploying to production.

## Why It Matters

Developing distributed systems is hard. Publar makes it easier by:

1. **Reducing iteration time**: No need to manually spin up servers, create clients, and connect them via CLI
2. **Visual debugging**: See exactly what's happening in your network at a glance
3. **Reproducible testing**: Scenarios ensure consistent test conditions across development sessions
4. **Learning tool**: Perfect for understanding how Pubky homeservers and clients interact
5. **Integration testing**: Test how your application behaves with multiple homeservers and concurrent clients

If you're building on Pubky, Publar helps you move faster and catch issues early.

## Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)**: Technical architecture, component details, algorithms, and data flow
- **[SCENARIOS.md](SCENARIOS.md)**: Complete guide to creating and using automated test scenarios

## Setup & Run

### Prerequisites

- **Rust** (1.70+): Install from [rustup.rs](https://rustup.rs)
- **Node.js** (16+): Required for Tailwind CSS compilation

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/publar.git
cd publar

# IMPORTANT: Install npm dependencies FIRST (required for CSS compilation)
npm install

# Build CSS and run
cargo run
```

**Note**: You must run `npm install` before `cargo run`. The build process uses Tailwind CSS which requires Node.js dependencies to be installed first.

The application window will open automatically. Start by adding a homeserver or running a pre-built scenario.

### Running Examples

To test external connections to Publar-managed homeservers:

```bash
# 1. Start Publar and create a homeserver (note its URL and public key from the UI)
cargo run

# 2. In a separate terminal, run the example
cargo run --example testnet_write_read <homeserver_url> <homeserver_pubkey>
```

Example:

```bash
cargo run --example testnet_write_read http://127.0.0.1:50000/ z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK
```

## Building for Distribution

### Prerequisites

Install the Dioxus CLI (`dx`):

```bash
cargo install dioxus-cli
```

Verify installation:
```bash
dx --version
```

### Building a macOS .app Bundle

To create a distributable macOS application:

```bash
dx bundle --platform desktop --package-types "macos"
```

The `.app` bundle will be created at:
```
target/dx/publar/bundle/macos/bundle/macos/Publar.app
```

You can then:
- Copy it to `/Applications/` or anywhere else
- Distribute it to users (no Rust installation required)
- Double-click to run like any native macOS app

**Size**: ~23MB

**Requirements**: macOS 10.15+ (ARM64 for Apple Silicon, x86_64 for Intel)

#### macOS "Damaged" App Fix

If you download a pre-release build from GitHub and macOS says the app is "damaged", run this command to remove the quarantine attribute:

```bash
# For .app bundle
xattr -cr /path/to/Publar.app

# For .dmg file
xattr -cr /path/to/Publar.dmg
```

Then right-click the app and select "Open" (or go to System Preferences → Security & Privacy and click "Open Anyway").

This is only needed for unsigned pre-release builds. Official releases will be properly code-signed and notarized.

### Distribution Checklist

For official distribution, you should:

1. **Code Signing** (macOS):
   ```bash
   codesign --force --deep --sign "Developer ID Application: Your Name" Publar.app
   ```

2. **Notarization** (macOS 10.15+):
   - Submit to Apple for notarization
   - Required for users to run the app without security warnings

3. **Create DMG** (optional):
   ```bash
   # Use tools like create-dmg or node-appdmg
   create-dmg Publar.app
   ```

### Building for Windows

To create a Windows MSI installer (must be run on Windows):

```bash
dx bundle --platform desktop --package-types "msi"
```

The installer will be created at:
```
target/dx/publar/bundle/msi/Publar_0.1.0_x64_en-US.msi
```

**Requirements**: Windows 10+ (x64)

### Building for Linux

#### Debian/Ubuntu (.deb)

To create a Debian package (must be run on Linux):

```bash
dx bundle --platform desktop --package-types "deb"
```

The package will be created at:
```
target/dx/publar/bundle/deb/publar_0.1.0_amd64.deb
```

Install with:
```bash
sudo dpkg -i publar_0.1.0_amd64.deb
```

#### AppImage (Universal Linux)

To create a portable AppImage (must be run on Linux):

```bash
dx bundle --platform desktop --package-types "appimage"
```

The AppImage will be created at:
```
target/dx/publar/bundle/appimage/publar_0.1.0_amd64.AppImage
```

Make executable and run:
```bash
chmod +x publar_0.1.0_amd64.AppImage
./publar_0.1.0_amd64.AppImage
```

**Requirements**: Most modern Linux distributions (glibc 2.31+)

### Cross-Platform Notes

- **You can only bundle for your current platform** - cross-compilation is not supported
- All builds are approximately 20-30MB in size
- No external dependencies required for end users

## Usage

### Manual Network Management

1. **Add nodes**: Click "Add Homeserver" or "Add Client" to create new nodes
2. **Select nodes**: Click any node to view details and available actions in the right sidebar
3. **Connect clients**: Select a client, choose a homeserver from the dropdown, and click "Connect to Homeserver"
4. **Write data**: Select a connected client, enter a path (e.g., `/pub/publar/test.txt`) and content, then click "Write"
5. **Read data**: Select a connected client, enter a path, and click "Read"
6. **Interact with visualization**: Drag nodes to reposition them, resize panels by dragging edges

### Automated Scenarios

Select a scenario from the dropdown and click "Play Scenario":

- **Simple Connection**: 1 homeserver + 1 client with a write/read operation
- **Multi Client**: 1 homeserver + 3 clients, each writing data independently
- **Rate Limiting**: 1 homeserver + 5 clients writing rapidly to test concurrent operations

Scenarios run automatically with timed operations, perfect for regression testing.

### Reset

Click "Reset" to clear all nodes and connections while keeping the testnet running.

## Development

### Building

```bash
# Development build (faster compilation, slower runtime)
cargo build

# Release build (optimized)
cargo build --release

# Run with logging
RUST_LOG=debug cargo run
```

### CSS Changes

Tailwind CSS recompiles automatically on `cargo build`. To manually rebuild:

```bash
npx tailwindcss -i ./assets/input.css -o ./assets/tailwind.css --watch
```

### Adding Scenarios

Scenarios are stored in `~/.publar/scenarios/` as JSON files. See [SCENARIOS.md](SCENARIOS.md) for the complete JSON schema and examples.

You can also add scenarios programmatically in `src/scenario.rs` by editing the `built_in_scenarios()` function.

## Troubleshooting

**Issue**: App crashes on startup

- **Solution**: Ensure no other processes are using ports 50000-51000

**Issue**: Homeserver fails to start

- **Solution**: Check `RUST_LOG=debug cargo run` for detailed error messages

**Issue**: Connections fail

- **Solution**: Wait for homeserver to show "Running" status before connecting clients

**Issue**: Force layout looks chaotic

- **Solution**: Click "Reset" and recreate nodes with fewer initial connections

## License

MIT License - see [LICENSE](LICENSE) file for details

## Related Projects

- **[Polar](https://github.com/jamaljsr/polar)**: Similar tool for Bitcoin Lightning Network that inspired Publar's design
