# Pubky MCP Server

Your complete Pubky ecosystem expert! This Model Context Protocol (MCP) server provides comprehensive knowledge, code examples, and development tools for building applications on the Pubky protocol.

## Features

🔺 **Complete Pubky Ecosystem Coverage**

The MCP provides expertise on **all 6 official Pubky projects** across 4 layers:

**Layer 1: Discovery**
- **Pkarr** (pkarr): Public-Key Addressable Resource Records - DHT-based discovery
- **Pkdns** (pkdns): DNS resolver that makes Pkarr domains work as TLDs in browsers

**Layer 2: Protocol**
- **Pubky Core** (pubky-core): Auth, storage, homeserver protocol

**Layer 3: Data Models**
- **App Specs** (pubky-app-specs): Validated data models (User, Post, Tag, etc.)

**Layer 4: Social Graph**
- **Nexus API** (nexus-webapi): REST API for reading social data
- **Nexus** (pubky-nexus): Graph indexer implementation (watcher, service, databases)

🛠️ **Smart Development Tools (65+ tools)**

- **Discovery**: Pkarr client generation, DNS record builders, keypair management
- **DNS Setup**: Pkdns browser/system configuration, server installation
- **Protocol**: Code generation, project scaffolding, auth flows
- **Data Models**: Validation, examples, schema generation
- **Social API**: Nexus client generation, endpoint exploration
- **Infrastructure**: Testnet management, Pkarr relay, Nexus dev setup
- **Environment**: Dependency management, project integration

📚 **Rich Code Examples**

- Rust and JavaScript/TypeScript examples
- Pre-built templates for common patterns
- Adaptive code generation based on your project
- Full-stack social app examples

💡 **Interactive Guides**

- Discovery: Pkarr resolution, DNS setup, domain publishing
- Protocol: Authentication, storage, capabilities, testnet
- Social Features: Feeds, posts, user profiles, Nexus architecture
- Data Validation: Model specs and validation rules
- Advanced: Nexus development, graph databases, indexing

## Installation

### Prerequisites

- Node.js 20+ (for the MCP server itself)
- Rust/Cargo (optional, for Pubky development)

### Install Dependencies

```bash
cd pubky-mcp-server
npm install
```

### Build

```bash
npm run build
```

## Configuration

### For Cursor

**Option 1: Using npx (Easiest - No installation needed)**

Add to your Cursor settings (Settings → Features → MCP):

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

**That's it!** All resources are bundled - no environment variables needed.

**Option 2: Global Installation**

```bash
npm install -g @pubky/mcp-server
```

Then configure:

```json
{
  "mcpServers": {
    "pubky": {
      "command": "pubky-mcp"
    }
  }
}
```

**Option 3: Local Development**

If you're developing the MCP server itself:

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

### What's Bundled?

The package includes everything you need:
- ✅ **Pubky Core docs & examples** (from https://github.com/pubky/pubky-core)
- ✅ **Nexus API specification** (from https://nexus.pubky.app/api-docs/v0/openapi.json)
- ✅ **Pubky App Specs** (from https://github.com/pubky/pubky-app-specs)

**No cloning repos. No environment variables. Just works!**

## Usage Examples

Once connected in Cursor, you can interact naturally:

### Example 1: Creating a New App

**You:** "Create a new Pubky app in JavaScript with authentication"

**MCP Server:**

- Uses `generate_app_scaffold` tool
- Creates project with auth flow code
- Provides setup instructions
- Suggests testnet for development

### Example 2: Understanding Concepts

**You:** "Explain what a Pubky homeserver is"

**MCP Server:**

- Uses `get_pubky_concept` tool
- Returns detailed explanation
- Provides code examples
- Links to relevant documentation

### Example 3: Debugging

**You:** "I'm getting a 403 error when trying to write to /pub/my-app/data.json"

**MCP Server:**

- Uses `explain_capabilities` tool
- Analyzes your capability string
- Suggests fixes
- Provides corrected code

### Example 4: Environment Setup

**You:** "Set up my project for Pubky development"

**MCP Server:**

- Uses `detect_environment` tool
- Uses `analyze_project` tool
- Installs missing dependencies
- Configures project files
- Starts testnet if needed

## Available Resources

Access via the resources panel in Cursor (25 total):

**Protocol Documentation:**
- `pubky://docs/overview` - Protocol overview
- `pubky://docs/concepts/homeserver` - Homeserver concept
- `pubky://docs/concepts/rootkey` - Root key concept
- `pubky://docs/auth` - Authentication specification
- `pubky://examples/rust/all` - All Rust examples
- `pubky://examples/javascript/all` - All JavaScript examples
- `pubky://api/homeserver` - Homeserver API reference
- `pubky://api/sdk` - SDK API documentation
- `pubky://api/capabilities` - Capabilities reference

**Nexus API (7 resources):**
- `pubky://api/nexus/overview` - API overview
- `pubky://api/nexus/endpoints/posts` - Post endpoints
- `pubky://api/nexus/endpoints/users` - User endpoints
- `pubky://api/nexus/endpoints/streams` - Stream endpoints
- `pubky://api/nexus/endpoints/search` - Search endpoints
- `pubky://api/nexus/endpoints/tags` - Tag endpoints
- `pubky://api/nexus/schemas` - All 42 data schemas

**Pubky App Specs (9 resources):**
- `pubky://specs/overview` - Data models overview
- `pubky://specs/models/user` - PubkyAppUser model
- `pubky://specs/models/post` - PubkyAppPost model
- `pubky://specs/models/tag` - PubkyAppTag model
- `pubky://specs/models/bookmark` - PubkyAppBookmark model
- `pubky://specs/models/follow` - PubkyAppFollow model
- `pubky://specs/models/file` - PubkyAppFile model
- `pubky://specs/models/feed` - PubkyAppFeed model
- `pubky://specs/examples` - JavaScript examples

## Available Tools

The server provides 28 tools:

### Documentation & Learning

- `get_pubky_concept` - Explain concepts
- `get_code_example` - Get specific examples
- `search_documentation` - Search all docs
- `explain_capabilities` - Parse capability strings

### Code Generation

- `generate_app_scaffold` - Create new projects
- `get_code_template` - Get code templates
- `list_templates` - Show available templates

### Environment & Analysis

- `analyze_project` - Analyze project structure
- `detect_environment` - Check installed tools
- `suggest_setup` - Recommend setup steps

### Dependency Management

- `ensure_dependencies` - Smart dependency installer
- `install_pubky_testnet` - Install testnet binary
- `setup_project_dependencies` - Add Pubky to projects
- `verify_installation` - Check tool installations

### Testnet Management

- `start_testnet` - Start local testnet
- `stop_testnet` - Stop testnet
- `restart_testnet` - Restart testnet
- `check_testnet_status` - Check if running
- `get_testnet_info` - Get connection details

### Integration

- `adapt_to_project` - Generate adaptive integration code
- `integrate_pubky` - Add Pubky to existing projects

### Nexus API Tools (NEW)

- `query_nexus_api` - Search Nexus endpoints
- `explain_nexus_endpoint` - Endpoint details with examples
- `generate_nexus_client` - Auto-generate API clients

### Pubky App Specs Tools (NEW)

- `generate_data_model` - Generate model code
- `validate_model_data` - Validate against specs
- `explain_model` - Model documentation
- `create_model_example` - Working code examples

## Available Prompts

Interactive guides for common tasks (10 total):

**Protocol Guides:**
- `create-pubky-app` - Create a new application
- `implement-auth` - Add authentication
- `add-storage` - Add storage operations
- `debug-capabilities` - Debug permission issues
- `setup-testnet` - Set up local testnet

**Social Features Guides (NEW):**
- `build-social-feed` - Build social feeds
- `create-post-ui` - Post creation with validation
- `implement-user-profile` - User profile management
- `query-social-data` - Query Nexus API
- `validate-app-data` - Data validation

## Development

### Running in Development Mode

```bash
npm run dev
```

### File Structure

```
pubky-mcp-server/
├── src/
│   ├── index.ts            # Main server entry point
│   ├── resources.ts        # Resource handlers (3-layer architecture)
│   ├── tools.ts            # Tool implementations (28 tools)
│   ├── prompts.ts          # Prompt templates (10 guides)
│   ├── types.ts            # TypeScript types
│   ├── constants.ts        # Constants and enums
│   └── utils/
│       ├── file-reader.ts  # File system utilities
│       ├── testnet.ts      # Testnet management
│       ├── environment.ts  # Environment detection
│       ├── templates.ts    # Code templates
│       ├── nexus-api.ts    # Nexus API parser (NEW)
│       └── app-specs.ts    # App specs parser (NEW)
├── dist/                   # Compiled JavaScript
├── package.json
├── tsconfig.json
├── cursor-config-example.json
└── README.md
```

## How It Works

The MCP server acts as a bridge between Cursor (or any MCP client) and the complete Pubky ecosystem:

1. **Resources**: Read-only access to documentation, API specs, and data models
2. **Tools**: Executable functions that perform actions (generate code, validate data, query APIs, manage testnet)
3. **Prompts**: Pre-configured conversation starters for common development tasks

All communication happens via stdio, making it fast and reliable.

## Architecture Overview

Pubky uses a **hub-spoke model** where your app interacts with different components for different purposes:

```
            ┌─────────────┐
            │   NEXUS     │ ← Crawls/indexes public data
            │  (Indexer)  │   from all homeservers (~0.5s)
            └─────────────┘
                 ▲
                 │ GET (read social data)
                 │ feeds, search, discovery
                 │
            ┌────┴────┐
            │  Your   │
            │  App    │
            └────┬────┘
                 │
                 │ PUT/DELETE (write your data)
                 │ following pubky-app-specs format
                 ▼
        ┌─────────────────┐
        │ Your Homeserver │ ← Your personal storage
        │  (pubky-core)   │   Authentication & auth
        └─────────────────┘
```

### Data Flow

**Writing Data (You → Your Homeserver):**
- Create a post → `PUT` to your homeserver at `/pub/pubky.app/posts/{id}`
- Update profile → `PUT` to your homeserver at `/pub/pubky.app/profile.json`
- Delete content → `DELETE` from your homeserver
- ✅ Use `pubky-app-specs` format for interoperability
- ❌ Nexus is NOT involved in writes

**Reading Social Data (You → Nexus):**
- View feed → `GET` from Nexus API (`/v0/stream/...`)
- Search users → `GET` from Nexus API (`/v0/search/users`)
- Discover posts → `GET` from Nexus API
- ✅ Nexus has already crawled and indexed all public data
- ❌ Don't query other homeservers directly (slow!)

**Reading Your Own Data (You → Your Homeserver):**
- Get your own post → `GET` from your homeserver
- List your files → `GET` from your homeserver
- Private data only you can access

## Troubleshooting

### Server Not Connecting

1. Check that the path in your MCP config is correct
2. Ensure the server is built: `npm run build`
3. Check Cursor's MCP logs for error messages

### Bundled Resources Not Found

If you see "Bundled resources not found", you're likely running from source without building:

```bash
cd pubky-mcp-server
npm run build  # Fetches resources and compiles
```

### Resources Outdated

To refresh bundled resources:

```bash
npm run fetch-resources  # Re-download latest public resources
npm run build:quick      # Recompile without fetching
```

### Tool Execution Errors

Most tools will provide helpful error messages. Common issues:

- Missing dependencies (use `detect_environment` tool)
- Invalid project paths
- Testnet not running (use `start_testnet` tool)

## Contributing

This MCP server is part of the Pubky Core project. Contributions welcome!

## License

MIT

---

**Made with ❤️ for Pubky developers**
