# Quick Start Guide

Get your Pubky MCP Server running in 3 minutes!

## 1. Build (if not already done)

```bash
cd pubky-mcp-server
npm install
npm run build  # Automatically fetches all resources
```

## 2. Configure Cursor

Edit your Cursor MCP config file (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "pubky": {
      "command": "node",
      "args": ["/absolute/path/to/hackathon-2025/pubky-mcp-server/dist/index.js"]
    }
  }
}
```

**Note:** No environment variables needed! All resources are bundled during build.

## 3. Restart Cursor

Close and reopen Cursor to load the MCP server.

## 4. Test It!

Open Cursor and try these commands:

### Test 1: Understand the Architecture

```
"Explain the Pubky architecture with all 4 layers"
```

Should explain Pkarr (discovery), Pubky Core (protocol), App Specs (data models), and Nexus (social API).

### Test 2: Pkarr Discovery

```
"How do I resolve a public key to find the homeserver using Pkarr?"
```

The MCP server will explain Pkarr's discovery layer.

### Test 3: Get Examples

```
"Show me how to publish DNS records with Pkarr in JavaScript"
```

Will show Pkarr code examples.

### Test 4: Start Development Environment

```
"Start the Pubky testnet for local development"
```

Starts local testnet with DHT, homeserver, and Pkarr relay.

### Test 5: Build an App

```
"Create a new Pubky social app called 'my-app' in TypeScript"
```

Generates a complete app scaffold.

## What Can You Do?

### Layer 1: Discovery

**Pkarr (Protocol)**
- "Explain how Pkarr discovery works"
- "Generate a Pkarr client to publish DNS records"
- "Show me how to resolve a public key"
- "Start a local Pkarr relay"
- "Generate code to create Pkarr keypairs"

**Pkdns (DNS Resolver)**
- "How do I set up pkdns in my browser?"
- "Configure my system DNS to use pkdns"
- "Install pkdns server"
- "Show me public pkdns servers"

### Layer 2: Pubky Core (Protocol)

- "Explain Pubky capabilities"
- "Show me the authentication flow"
- "What is a root key?"
- "How do I store data on a homeserver?"

### Layer 3: App Specs (Data Models)

- "Show me how to create a post with validation"
- "Explain the User model"
- "Generate code for PubkyAppPost"
- "Validate my post data"

### Layer 4: Social Graph

**Nexus API (Interface)**
- "Show me all Nexus API endpoints"
- "How do I query a social feed?"
- "Generate a Nexus API client"
- "Explain the UserView schema"

**Nexus Implementation (For Advanced Users)**
- "Explain Nexus architecture"
- "How do I set up Nexus development environment?"
- "Explain the Nexus watcher component"
- "Show me how to run Nexus locally"

### Development Tools

- "Create a new Pubky app"
- "Start the testnet"
- "Add Pubky to my existing React app"
- "Check if I have all tools installed"

## Troubleshooting

### "MCP server not found"

1. Check the path in your config is correct (use absolute path)
2. Make sure you ran `npm run build`
3. Restart Cursor completely

### "Resources not found"

Run `npm run build` to fetch all resources (Pkarr, Pubky Core, App Specs, Nexus).

### "Tool execution failed"

Most tools provide error messages. Common fixes:

- Install missing dependencies (`cargo`, `node`, etc.)
- Start the testnet if needed: "Start testnet"
- For Pkarr relay tools: Ensure Rust/Cargo is installed

## Next Steps

1. **Explore the 4 Layers**: Ask about each layer (Pkarr, Core, App Specs, Nexus)
2. **Browse Resources**: Access documentation via MCP resources panel
3. **Try Tools**: Experiment with 55+ development tools
4. **Build Something**: Create your first Pubky app!

## Pro Tips

- The MCP server is context-aware - it can analyze your current project and adapt suggestions
- Use natural language – no need to specify tool names
- Chain requests: "Create a new app, start testnet, and add auth"
- The server has access to all Pubky documentation and examples

---

**Happy Building! 🚀**

Need help? Just ask the MCP server: "How do I use the Pubky MCP server?"
