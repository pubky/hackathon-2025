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

## Setup & Run

### Prerequisites

- **Rust** (1.70+): Install from [rustup.rs](https://rustup.rs)
- **Node.js** (16+): Required for Tailwind CSS compilation

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/publar.git
cd publar

# Install npm dependencies for Tailwind CSS
npm install

# Build and run (Tailwind CSS compiles automatically)
cargo run
```

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

## Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Publar UI (Dioxus)                  │
│  ┌─────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │   Topbar    │  │  Visualization   │  │    Sidebar    │  │
│  │   Controls  │  │  Force-Directed  │  │  Node Details │  │
│  │             │  │      Graph       │  │  Event Log    │  │
│  └─────────────┘  └──────────────────┘  └───────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Testnet Manager    │
              │   (pubky-testnet)    │
              └──────────┬───────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   ┌─────────┐     ┌─────────┐     ┌─────────┐
   │Homeserver│    │Homeserver│    │Homeserver│
   │  :50000  │    │  :50001  │    │  :50002  │
   └─────────┘     └─────────┘     └─────────┘
        ▲                ▲                ▲
        │                │                │
   ┌────┴───┐       ┌───┴────┐      ┌───┴────┐
   │Client 1│       │Client 2│      │Client 3│
   └────────┘       └────────┘      └────────┘
```

### Components

**Frontend (Dioxus 0.6)**

- **Topbar**: Controls for adding nodes, running scenarios, and resetting
- **Network Visualization**: Interactive SVG graph with force-directed layout (Fruchterman-Reingold algorithm)
  - Homeservers: White circles with port labels
  - Clients: Lime green (#c7ff00) circles with truncated public keys
  - Connections: Lime green lines showing client-homeserver relationships
- **Context Sidebar**: Resizable panel with node details, actions, and event log

**Backend (pubky-testnet + pubky)**

- **Testnet Manager**: Manages multiple homeserver processes via pubky-testnet
- **Session Management**: Maintains client sessions with homeservers
- **Scenario Engine**: Executes timed operations (create, connect, write, read)

**State Management**

- Dioxus signals for reactive UI updates
- Shared Arc<Mutex<>> for cross-task state access

### Data Flow

```
User Action → Dioxus Event Handler → Testnet Manager → Homeserver HTTP API
                                            ↓
                                    Update Signals
                                            ↓
                                   UI Re-renders
                                            ↓
                                    Log Event Entry
```

### Key Algorithms

**Force-Directed Layout**

- **Repulsion**: All nodes push away from each other (prevents overlap)
- **Spring Forces**: Connected nodes maintain ideal distance (~150px)
- **Damping**: Velocity decay creates smooth stabilization
- Runs continuously every 50ms for dynamic repositioning

**Scenario Execution**

- Operations grouped by timestamp
- Sequential execution with precise timing
- Async/await for non-blocking UI

## File Structure

```
publar/
├── src/
│   ├── main.rs                      # App entry, state, event handlers
│   ├── components/
│   │   ├── topbar.rs                # Top control bar
│   │   ├── network_visualization.rs # SVG graph with force layout
│   │   └── context_sidebar.rs       # Right panel (details + log)
│   ├── testnet.rs                   # Wrapper around pubky-testnet
│   ├── scenario.rs                  # Scenario definitions and operations
│   ├── force_layout.rs              # Fruchterman-Reingold algorithm
│   └── api.rs                       # REST API (future)
├── examples/
│   └── testnet_write_read.rs        # External connection example
├── assets/
│   ├── input.css                    # Tailwind source
│   └── tailwind.css                 # Generated CSS
├── build.rs                         # Compiles Tailwind on build
├── tailwind.config.js               # Tailwind configuration
├── package.json                     # npm dependencies
├── Cargo.toml                       # Rust dependencies
├── Dioxus.toml                      # Dioxus bundling configuration
└── SCENARIOS.md                     # JSON scenario documentation
```

## Key Technologies

- **[Dioxus 0.6](https://dioxuslabs.com/)**: Cross-platform UI framework (desktop, web, mobile)
- **[Tailwind CSS v3](https://tailwindcss.com/)**: Utility-first styling
- **[Tokio](https://tokio.rs/)**: Async runtime
- **[pubky-testnet 0.6.0-rc.6](https://github.com/pubky/pubky)**: Manages local homeserver processes
- **[pubky 0.6.0-rc.6](https://github.com/pubky/pubky)**: Client library for Pubky protocol

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

## Building for Distribution

### Prerequisites

Install the Dioxus CLI:

```bash
cargo install dioxus-cli
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

### Cross-Platform Builds

The `dx bundle` command supports multiple platforms:

```bash
# macOS (on macOS)
dx bundle --platform desktop --package-types "macos"

# Windows (on Windows)
dx bundle --platform desktop --package-types "msi"

# Linux (on Linux)
dx bundle --platform desktop --package-types "deb"
dx bundle --platform desktop --package-types "appimage"
```

**Note**: You can only bundle for your current platform. Cross-compilation is not supported.

## Troubleshooting

**Issue**: App crashes on startup

- **Solution**: Ensure no other processes are using ports 50000-51000

**Issue**: Homeserver fails to start

- **Solution**: Check `RUST_LOG=debug cargo run` for detailed error messages

**Issue**: Connections fail

- **Solution**: Wait for homeserver to show "Running" status before connecting clients

**Issue**: Force layout looks chaotic

- **Solution**: Click "Reset" and recreate nodes with fewer initial connections

## Contributing

Contributions are welcome! Areas that need help:

- [ ] Add more pre-built scenarios
- [ ] Implement REST API for external control
- [ ] Add export/import for network topologies
- [ ] Improve force-directed layout performance
- [ ] Add search/filter for event log

Please open an issue before starting work on major features.

## License

MIT License - see [LICENSE](LICENSE) file for details

## Related Projects

- **[Pubky](https://github.com/pubky/pubky)**: The core Pubky protocol and client library
- **[Polar](https://github.com/jamaljsr/polar)**: Similar tool for Bitcoin Lightning Network (inspiration for Publar)
- **[pubky-nexus](https://github.com/pubky/pubky-nexus)**: Social graph indexer for Pubky

## Acknowledgments

- Inspired by [Polar](https://github.com/jamaljsr/polar) for Lightning Network development
- Built on the excellent [Dioxus](https://dioxuslabs.com/) framework
- Thanks to the Pubky team for the testnet library
