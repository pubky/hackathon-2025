# Quick Setup Guide

## Zero Configuration Setup

The Pubky MCP Server now **bundles all resources** - no environment variables needed!

## Understanding Pubky Architecture First

Before diving in, understand how Pubky works:

```
        ┌─────────────┐
        │   NEXUS     │ ← Indexes public data from all homeservers
        │  (Indexer)  │   (crawls every ~0.5 seconds)
        └─────────────┘
             ▲
             │ READ: Get feeds, search, discovery
             │
        ┌────┴────┐
        │  Your   │
        │  App    │
        └────┬────┘
             │
             │ WRITE: Store posts, profile, data
             ▼
    ┌─────────────────┐
    │ Your Homeserver │ ← Your personal storage backend
    └─────────────────┘
```

**Key Points:**
- **Write to YOUR homeserver** following `pubky-app-specs` format
- **Read from NEXUS** for social features (feeds, search, etc.)
- Nexus automatically discovers and indexes public data

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

Knowledge base:
  • Layer 1: Protocol (pubky-core) - Auth, storage, homeserver
  • Layer 2: Data Models (pubky-app-specs) - User, Post, Tag, etc.
  • Layer 3: Social API (nexus-webapi) - Streams, feeds, search
```

## Test the Enhanced Features

Try these commands in Cursor:

1. **"Show me all Nexus API endpoints"** - Should list endpoints from nexus-webapi.json
2. **"How do I create a post?"** - Should show PubkyAppPost model with validation
3. **"Generate a Nexus API client"** - Should create client code
4. **"Explain the UserView schema"** - Should show schema from Nexus API

## What You Get

**Bundled in every installation:**

- ✅ **25 Resources**: Complete documentation across all 3 components
  - 9 Homeserver resources (pubky-core) - Where you write data
  - 9 App Specs resources (data models) - What format to use
  - 7 Nexus API resources (endpoints, schemas) - Where you read social data

- ✅ **28 Tools**: Full development toolkit
  - 21 Homeserver tools (auth, storage, testnet)
  - 4 App Specs tools (models, validation)
  - 3 Nexus API tools (query, explain, generate)

- ✅ **10+ Prompts**: Interactive guides
  - Protocol guides (auth, storage, testnet)
  - Social feature guides (feeds, posts, profiles)
  - Architecture understanding guides

**Zero dependencies on external repos or environment variables!**

## Troubleshooting

**"Bundled resources not found"**

→ Run `npm run build` to fetch and bundle resources

**"Resources seem outdated"**

→ Run `npm run fetch-resources` to refresh from public sources

**Server won't start**

→ Make sure you've run `npm install` and `npm run build`


