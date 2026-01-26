# Publar Architecture

This document describes the technical architecture and implementation details of Publar.

## High-Level Overview

```
      ┌───────────────────┐
      │   Publar UI       │
      │   (Dioxus)        │
      └─────────┬─────────┘
                │
                ▼
      ┌───────────────────┐
      │  Testnet Manager  │
      │  (pubky-testnet)  │
      └─────────┬─────────┘
                │
    ┌───────────┼───────────┐
    ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│Homeserver│Homeserver│Homeserver│
│  :50000  │  :50001  │  :50002  │
└────▲────┘ └────▲────┘ └────▲────┘
     │           │           │
 ┌───┴──┐    ┌───┴──┐    ┌───┴──┐
 │Client│    │Client│    │Client│
 └──────┘    └──────┘    └──────┘
```

## Components

### Frontend (Dioxus 0.6)

- **Topbar**: Controls for adding nodes, running scenarios, and resetting
- **Network Visualization**: Interactive SVG graph with force-directed layout (Fruchterman-Reingold algorithm)
  - Homeservers: White circles with port labels
  - Clients: Lime green (#c7ff00) circles with truncated public keys
  - Connections: Lime green lines showing client-homeserver relationships
- **Context Sidebar**: Resizable panel with node details, actions, and event log

### Backend (pubky-testnet + pubky)

- **Testnet Manager**: Manages multiple homeserver processes via pubky-testnet
- **Session Management**: Maintains client sessions with homeservers
- **Scenario Engine**: Executes timed operations (create, connect, write, read)

### State Management

- Dioxus signals for reactive UI updates
- Shared Arc<Mutex<>> for cross-task state access

## Data Flow

```
User Action → Dioxus Event Handler → Testnet Manager → Homeserver HTTP API
                                            ↓
                                    Update Signals
                                            ↓
                                   UI Re-renders
                                            ↓
                                    Log Event Entry
```

## Key Algorithms

### Force-Directed Layout

- **Repulsion**: All nodes push away from each other (prevents overlap)
- **Spring Forces**: Connected nodes maintain ideal distance (~150px)
- **Damping**: Velocity decay creates smooth stabilization
- Runs continuously every 50ms for dynamic repositioning

### Scenario Execution

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
