# Quick Start Guide

Get your Pubky MCP Server running in 3 minutes!

## 1. Build (if not already done)

```bash
cd /Users/vlada/Projects/pubky-mcp-server
npm install
npm run build
```

## 2. Configure Cursor

### Option A: User Settings (Recommended)

1. Open Cursor
2. Go to Settings (Cmd+, on Mac)
3. Search for "MCP"
4. Click "Edit in settings.json"
5. Add this configuration:

```json
{
  "mcp": {
    "servers": {
      "pubky-core": {
        "command": "node",
        "args": ["/Users/vlada/Projects/pubky-mcp-server/dist/index.js"],
        "env": {
          "PUBKY_CORE_PATH": "/Users/vlada/Projects/pubky-core"
        }
      }
    }
  }
}
```

### Option B: Workspace Settings

Create `.cursor/config.json` in your project:

```json
{
  "mcpServers": {
    "pubky-core": {
      "command": "node",
      "args": ["/Users/vlada/Projects/pubky-mcp-server/dist/index.js"],
      "env": {
        "PUBKY_CORE_PATH": "/Users/vlada/Projects/pubky-core"
      }
    }
  }
}
```

## 3. Restart Cursor

Close and reopen Cursor to load the MCP server.

## 4. Test It!

Open Cursor and try these commands:

### Test 1: Ask About Pubky

```
"What is a Pubky homeserver?"
```

The MCP server will use the `get_pubky_concept` tool to explain.

### Test 2: Get an Example

```
"Show me how to implement Pubky authentication in JavaScript"
```

The MCP server will use `get_code_example` or `implement-auth` prompt.

### Test 3: Create a New App

```
"Create a new Pubky app called 'my-social-app' in TypeScript"
```

The MCP server will use `generate_app_scaffold` to create the project.

### Test 4: Start Testnet

```
"Start the Pubky testnet so I can test locally"
```

The MCP server will use `start_testnet` to launch a local testnet.

## What Can You Do?

### Documentation Access

- "Explain Pubky capabilities"
- "Show me the authentication spec"
- "What is a root key?"
- "Search the docs for 'storage'"

### Code Generation

- "Create a new Pubky app"
- "Show me a template for auth flow"
- "Generate storage code for my app"

### Environment Setup

- "Check if I have all the tools installed"
- "Install pubky-testnet"
- "Add Pubky to my project"
- "Set up my environment for Pubky development"

### Testnet Management

- "Start the testnet"
- "What's the status of my testnet?"
- "Give me the testnet connection details"
- "Stop the testnet"

### Integration Help

- "Add Pubky to my existing React app"
- "How do I integrate Pubky with my project?"
- "Analyze my project and suggest Pubky setup"

## Troubleshooting

### "MCP server not found"

1. Check the path in your config is correct
2. Make sure you ran `npm run build`
3. Restart Cursor completely

### "Pubky Core not found"

Update `PUBKY_CORE_PATH` in your MCP config to point to your pubky-core location:

```json
{
  "env": {
    "PUBKY_CORE_PATH": "/correct/path/to/pubky-core"
  }
}
```

### "Tool execution failed"

Most tools provide error messages explaining what went wrong. Common fixes:

- Install missing dependencies (`cargo`, `node`, etc.)
- Start the testnet if needed
- Check file paths

## Next Steps

1. **Read the README**: `/Users/vlada/Projects/pubky-mcp-server/README.md`
2. **Explore Resources**: Browse Pubky docs through the MCP resources panel
3. **Try Tools**: Experiment with different tools to see what they can do
4. **Build Something**: Create a Pubky app and start developing!

## Pro Tips

- The MCP server is context-aware - it can analyze your current project and adapt suggestions
- Use natural language – no need to specify tool names
- Chain requests: "Create a new app, start testnet, and add auth"
- The server has access to all Pubky documentation and examples

---

**Happy Building! 🚀**

Need help? Just ask the MCP server: "How do I use the Pubky MCP server?"
