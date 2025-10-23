# Quick Setup Guide

## Zero Configuration Setup

The Pubky MCP Server now **bundles all resources** - no environment variables needed!

## Understanding Pubky Architecture First

Before diving in, understand the complete 4-layer Pubky stack:

```
┌──────────────────────────────────────────────────────────┐
│  Layer 4: NEXUS (Social Indexer)                         │
│  WHERE to READ: Aggregated feeds, search, discovery      │
└────────────────────┬─────────────────────────────────────┘
                     │ READ (via Nexus API)
                     │
┌────────────────────┴─────────────────────────────────────┐
│  Layer 3: APP SPECS (Data Models)                        │
│  WHAT format: User, Post, Tag, etc. with validation      │
└────────────────────┬─────────────────────────────────────┘
                     │ Format data
                     │
┌────────────────────┴─────────────────────────────────────┐
│  Layer 2: PUBKY CORE (Protocol)                          │
│  HOW to access: Auth, storage, capabilities              │
└────────────────────┬─────────────────────────────────────┘
                     │ WRITE (to homeserver)
                     │
┌────────────────────┴─────────────────────────────────────┐
│  Layer 1: PKARR (Discovery)                              │
│  WHERE is homeserver: Resolve pubkey → homeserver URL    │
└──────────────────────────────────────────────────────────┘
```

**Complete Flow:**
1. **Pkarr**: Resolve public key to find homeserver location
2. **Pubky Core**: Connect and authenticate with homeserver  
3. **App Specs**: Format data (User, Post, etc.)
4. **Nexus**: Read aggregated social data from all users

---

## Installation Options

All you need is one of these options:

### Option 1: npx (Fastest - No Installation)

1. Open Cursor Settings (Cmd+,)
2. Go to **Features** → **MCP**
3. Click **Edit Config**
4. Add this:

```json
{
  "mcpServers": {
    "pubky": {
      "command": "npx",
      "args": ["@pubky/mcp-server"]
    }
  }
}
```

5. Save and restart Cursor
6. **Done!** No installation, no configuration needed.

### Option 2: Global Installation

```bash
npm install -g @pubky/mcp-server
```

Configure Cursor:

```json
{
  "mcpServers": {
    "pubky": {
      "command": "pubky-mcp"
    }
  }
}
```

### Option 3: Local Development

If you're working on the MCP server code itself:

```bash
cd pubky-mcp-server
npm install
npm run build  # Fetches resources and compiles
```

Configure Cursor:

```json
{
  "mcpServers": {
    "pubky": {
      "command": "node",
      "args": ["/absolute/path/to/pubky-hackathon/pubky-mcp-server/dist/index.js"]
    }
  }
}
```

## Verify It's Working

After setup, the server should display:

```
✅ Pubky MCP Server running

🔺 Complete Pubky Stack (4 Layers):
  • Layer 1: Pkarr (pkarr) - WHERE is the homeserver? (Discovery via DHT)
  • Layer 2: Pubky Core (pubky-core) - HOW to read/write homeserver
  • Layer 3: App Specs (pubky-app-specs) - WHAT format to use
  • Layer 4: Nexus (nexus-webapi) - WHERE you READ aggregated social data
```

## Test All 4 Layers

Try these commands in Cursor:

1. **"Explain how Pkarr discovery works"** - Layer 1: Discovery via DHT
2. **"Show me Pubky authentication flow"** - Layer 2: Protocol & auth
3. **"How do I create a validated post?"** - Layer 3: Data models
4. **"Show me all Nexus API endpoints"** - Layer 4: Social indexer
5. **"Generate a complete Pubky app with all layers"** - Full stack integration

## What You Get

**Bundled in every installation:**

- ✅ **75+ Resources**: Complete documentation across all 6 projects
  - 13 Pkarr resources (discovery protocol, DHT, relay)
  - 5 Pkdns resources (DNS resolver, setup guides)
  - 9 Pubky Core resources (protocol, auth, storage)
  - 9 App Specs resources (data models, validation)
  - 7 Nexus API resources (REST endpoints, schemas)
  - 7 Nexus impl resources (architecture, components, dev setup)

- ✅ **65+ Tools**: Full development toolkit
  - 14 Pkarr tools (discovery, DNS records, relay management)
  - 4 Pkdns tools (browser setup, system DNS, installation)
  - 21 Pubky Core tools (auth, storage, testnet)
  - 4 App Specs tools (models, validation)
  - 3 Nexus API tools (query, explain, generate)
  - 3 Nexus impl tools (architecture, dev setup, components)
  - 16+ Environment tools (setup, installation, integration)

- ✅ **11 Prompts**: Interactive guides
  - Discovery & DNS (Pkarr, Pkdns)
  - Protocol & auth (Pubky Core)
  - Social features (feeds, posts, profiles, Nexus)
  - Data validation (App Specs)
  - Advanced (Nexus development)

**Zero dependencies on external repos or environment variables!**

## Troubleshooting

**"Bundled resources not found"**

→ Run `npm run build` to fetch and bundle resources

**"Resources seem outdated"**

→ Run `npm run fetch-resources` to refresh from public sources

**Server won't start**

→ Make sure you've run `npm install` and `npm run build`


