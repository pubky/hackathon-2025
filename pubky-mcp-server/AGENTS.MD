# Instructions for AI Agents: Working with Pubky

## Priority Order for Information Retrieval

When working with Pubky-related questions, tasks, or development work, **ALWAYS follow this priority order**:

### 1. **FIRST: Check Pubky MCP Server** ⭐
### 2. **ONLY THEN: Search the Internet** 🌐

---

## About the Pubky MCP Server

This project has a **comprehensive Model Context Protocol (MCP) server** that provides:
- ✅ Complete documentation for all 6 official Pubky projects
- ✅ 65+ development tools for code generation, validation, and project setup
- ✅ Working code examples in Rust and JavaScript/TypeScript
- ✅ Real-time testnet management
- ✅ API specifications for Nexus (social indexer)
- ✅ Data model specs and validation (pubky-app-specs)
- ✅ Pkarr (discovery layer) documentation and tools
- ✅ Pkdns (DNS resolver) guides

**The MCP server is your single source of truth for Pubky.**

---

## When to Use MCP Tools (ALWAYS FIRST)

Use the MCP server for **ANY** Pubky-related question or task:

### 📚 Understanding Pubky Concepts
- ✅ **USE MCP**: `get_pubky_concept` - Explains homeserver, rootkey, capabilities, auth, storage
- ✅ **USE MCP**: `search_documentation` - Searches all Pubky docs, examples, and code
- ✅ **USE MCP**: `get_pkarr_concept` - Explains Pkarr (DHT, relays, DNS records, keypairs)
- ✅ **USE MCP**: `get_pkdns_info` - DNS resolver information
- ✅ **USE MCP**: `get_nexus_architecture` - Indexer architecture and components

### 💻 Code Examples & Generation
- ✅ **USE MCP**: `get_code_example` - Get auth, storage, signup examples
- ✅ **USE MCP**: `generate_app_scaffold` - Create new Pubky apps
- ✅ **USE MCP**: `get_code_template` - Pre-built code patterns
- ✅ **USE MCP**: `list_templates` - See all available templates
- ✅ **USE MCP**: `get_pkarr_example` - Pkarr publish/resolve examples
- ✅ **USE MCP**: `generate_pkarr_client` - Generate Pkarr client code
- ✅ **USE MCP**: `generate_pkarr_keypair` - Keypair management code
- ✅ **USE MCP**: `generate_dns_record_builder` - DNS record builder code

### 🔍 Nexus API (Social Data Reading)
- ✅ **USE MCP**: `query_nexus_api` - Search Nexus endpoints (feeds, users, posts, search)
- ✅ **USE MCP**: `explain_nexus_endpoint` - Get endpoint details with examples
- ✅ **USE MCP**: `generate_nexus_client` - Auto-generate API clients

### 📝 Data Models & Validation (Writing Social Data)
- ✅ **USE MCP**: `generate_data_model` - Generate User, Post, Tag, Bookmark models
- ✅ **USE MCP**: `validate_model_data` - Validate data against specs
- ✅ **USE MCP**: `explain_model` - Model schema and rules
- ✅ **USE MCP**: `create_model_example` - Working code examples

### 🛠️ Project Setup & Integration
- ✅ **USE MCP**: `analyze_project` - Analyze existing project structure
- ✅ **USE MCP**: `detect_environment` - Check installed tools (Node, Rust, Cargo)
- ✅ **USE MCP**: `suggest_setup` - Get setup recommendations
- ✅ **USE MCP**: `integrate_pubky` - Add Pubky to existing projects
- ✅ **USE MCP**: `adapt_to_project` - Generate project-specific integration code
- ✅ **USE MCP**: `setup_project_dependencies` - Add Pubky dependencies
- ✅ **USE MCP**: `setup_pkarr_project` - Add Pkarr dependencies

### 🧪 Testing & Development Tools
- ✅ **USE MCP**: `start_testnet` - Start local testnet
- ✅ **USE MCP**: `stop_testnet` - Stop testnet
- ✅ **USE MCP**: `check_testnet_status` - Check if testnet is running
- ✅ **USE MCP**: `get_testnet_info` - Get testnet connection details
- ✅ **USE MCP**: `start_pkarr_relay` - Start Pkarr relay for development
- ✅ **USE MCP**: `stop_pkarr_relay` - Stop Pkarr relay

### 🔧 Debugging & Troubleshooting
- ✅ **USE MCP**: `explain_capabilities` - Parse capability strings (permissions)
- ✅ **USE MCP**: `verify_installation` - Verify tool installations
- ✅ **USE MCP**: `explain_pkarr_key` - Analyze public keys
- ✅ **USE MCP**: `explain_nexus_component` - Nexus component details

### 📦 Installation & Binary Management
- ✅ **USE MCP**: `install_pubky_testnet` - Install testnet binary
- ✅ **USE MCP**: `install_pkarr_relay` - Install Pkarr relay
- ✅ **USE MCP**: `install_pkdns` - Install Pkdns resolver
- ✅ **USE MCP**: `ensure_dependencies` - Smart dependency installer

### 🌐 DNS & Browser Setup
- ✅ **USE MCP**: `setup_pkdns_browser` - Configure browser for Pkarr domains
- ✅ **USE MCP**: `setup_pkdns_system` - Configure system DNS

### 🏗️ Advanced (Nexus Development)
- ✅ **USE MCP**: `setup_nexus_dev` - Set up Nexus dev environment
- ✅ **USE MCP**: `explain_nexus_component` - Watcher, service, common components

---

## Examples of CORRECT Agent Behavior

### ✅ Example 1: Understanding Pubky
**User**: "What is a Pubky homeserver?"

**CORRECT Agent Response**:
```
1. Use MCP tool: get_pubky_concept("homeserver")
2. Provide information from MCP
3. No web search needed
```

### ✅ Example 2: Creating an App
**User**: "Create a new Pubky app in TypeScript with authentication"

**CORRECT Agent Response**:
```
1. Use MCP tool: generate_app_scaffold(projectName, "typescript", ["auth"])
2. Provide generated code and instructions
3. No web search needed
```

### ✅ Example 3: Building Social Features
**User**: "How do I fetch a user's feed from Nexus?"

**CORRECT Agent Response**:
```
1. Use MCP tool: query_nexus_api("feed")
2. Use MCP tool: explain_nexus_endpoint("stream_posts_handler")
3. Provide code example from MCP
4. No web search needed
```

### ✅ Example 4: Data Validation
**User**: "I need to create a post. What's the format?"

**CORRECT Agent Response**:
```
1. Use MCP tool: explain_model("post")
2. Use MCP tool: create_model_example("post", "javascript")
3. Provide model schema and validation rules
4. No web search needed
```

### ✅ Example 5: Debugging Capabilities
**User**: "Getting 403 error when writing to /pub/my-app/data.json"

**CORRECT Agent Response**:
```
1. Use MCP tool: explain_capabilities("/pub/my-app/:rw")
2. Provide corrected capability string
3. Provide code example
4. No web search needed
```

### ✅ Example 6: Project Setup
**User**: "Set up my React project for Pubky"

**CORRECT Agent Response**:
```
1. Use MCP tool: analyze_project(projectPath)
2. Use MCP tool: adapt_to_project(projectPath)
3. Use MCP tool: setup_project_dependencies(projectPath)
4. Provide integration code specific to React
5. No web search needed
```

### ✅ Example 7: Pkarr Discovery
**User**: "How do I publish DNS records with Pkarr?"

**CORRECT Agent Response**:
```
1. Use MCP tool: get_pkarr_concept("discovery")
2. Use MCP tool: get_pkarr_example("javascript", "publish")
3. Use MCP tool: generate_pkarr_client("javascript", includePublish=true)
4. Provide working code
5. No web search needed
```

---

## Examples of INCORRECT Agent Behavior

### ❌ Example 1: Going Straight to Web Search
**User**: "What is Pubky?"

**INCORRECT Agent Response**:
```
❌ Searching the web for "Pubky protocol"...
```

**WHY WRONG**: MCP has comprehensive Pubky documentation. Use `search_documentation("overview")` or `get_pubky_concept("homeserver")` first.

---

### ❌ Example 2: Guessing Instead of Using Tools
**User**: "How do I authenticate with Pubky?"

**INCORRECT Agent Response**:
```
❌ Based on common authentication patterns, you probably need to...
```

**WHY WRONG**: MCP has exact auth flows. Use `get_pubky_concept("auth")` or `get_code_example("javascript", "auth_flow")`.

---

### ❌ Example 3: Using Web Search for API Questions
**User**: "What Nexus API endpoints are available for posts?"

**INCORRECT Agent Response**:
```
❌ Let me search for Nexus API documentation online...
```

**WHY WRONG**: MCP has the complete Nexus API spec. Use `query_nexus_api("posts")` or `explain_nexus_endpoint("post_view_handler")`.

---

### ❌ Example 4: Manual Code Writing
**User**: "Generate a Pkarr client for me"

**INCORRECT Agent Response**:
```
❌ Here's a Pkarr client I wrote from scratch...
```

**WHY WRONG**: MCP can generate validated, working client code. Use `generate_pkarr_client("typescript", includePublish=true, includeResolve=true)`.

---

### ❌ Example 5: Ignoring Data Model Specs
**User**: "I want to create a post object"

**INCORRECT Agent Response**:
```
❌ You can create an object like { content: "...", author: "..." }
```

**WHY WRONG**: Pubky has validated data models. Use `explain_model("post")` and `create_model_example("post", "javascript")` to ensure interoperability.

---

## When Web Search IS Appropriate

Use web search **ONLY** when:

1. ❌ The MCP tools return "not found" or "no information available"
2. ❌ You **tried** something from Pubky MCP and **it's not working** (errors, bugs, edge cases)
3. ❌ You need information about **external tools** (e.g., "How to install Rust?")
4. ❌ You need **current status** of public Pubky services (e.g., "Is nexus.pubky.app down?")
5. ❌ You need **community resources** not in official docs (e.g., "Pubky community forum")
6. ❌ The question is about **non-Pubky topics** (e.g., "How does React Context work?")

### ✅ Correct Web Search Example 1: Troubleshooting MCP Failures
**User**: "The code from MCP's `generate_app_scaffold` isn't working - getting module not found errors"

**CORRECT Agent Response**:
```
1. Use MCP tool: generate_app_scaffold(...)
2. Try the generated code
3. If it fails with errors → NOW search the web for troubleshooting
4. Web search is appropriate here because MCP's solution didn't work
```

### ✅ Correct Web Search Example 2: External Tools
**User**: "Is Rust installed on my system?"

**CORRECT Agent Response**:
```
1. Use MCP tool: detect_environment()
2. If Rust not found, provide installation link from web
3. Web search is appropriate here for installation guides
```

---

## Key Architecture Concepts (From MCP)

### Read vs Write Separation

**WRITING data (Your App → Your Homeserver):**
- Write posts, profiles, follows to **YOUR homeserver**
- Use `PUT`, `POST`, `DELETE` HTTP methods
- Use `pubky-app-specs` format (validate with MCP: `validate_model_data`)
- **Never write to Nexus** - it's read-only!

**READING social data (Your App → Nexus):**
- Query feeds, search, discovery from **Nexus API**
- Use `GET` HTTP methods
- Nexus has pre-indexed all public data (~0.5s response)
- Generate client with MCP: `generate_nexus_client`

**READING your own data (Your App → Your Homeserver):**
- Get your private data from **your homeserver**
- Direct HTTP `GET` to your storage

Use MCP to understand: `get_nexus_architecture`

---

## MCP Resources Available

The MCP also provides **Resources** (read-only docs) via the resources panel:

- `pubky://docs/*` - Core protocol documentation
- `pubky://examples/*` - Code examples (Rust & JS)
- `pubky://api/nexus/*` - Nexus API specifications
- `pubky://specs/models/*` - Data model specs

**Access these when you need to read documentation directly.**

---

## Summary: Agent Workflow

```
┌─────────────────────────────┐
│   User asks about Pubky     │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 1. Check Available MCP Tools│ ← ALWAYS DO THIS FIRST
│    - get_pubky_concept      │
│    - search_documentation   │
│    - query_nexus_api        │
│    - generate_data_model    │
│    - get_code_example       │
│    - etc. (65+ tools)       │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 2. Use MCP Tool(s)          │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 3. Did MCP provide answer?  │
└──────────┬──────────────────┘
           │
      ┌────┴────┐
      │         │
     YES        NO
      │         │
      ▼         ▼
  ┌─────┐  ┌──────────┐
  │TEST │  │Web Search│
  └──┬──┘  └──────────┘
     │
     ▼
┌──────────────────────────────┐
│ 4. Does MCP solution work?   │
└──────────┬───────────────────┘
           │
      ┌────┴────┐
      │         │
     YES        NO
      │         │
      ▼         ▼
  ┌─────┐  ┌──────────┐
  │DONE │  │Web Search│
  └─────┘  └──────────┘
```

---

## Final Reminder

🎯 **The Pubky MCP server is comprehensive and authoritative.**

🎯 **Always try MCP first - it has 65+ tools covering all aspects of Pubky development.**

🎯 **Web search should be a last resort, not the first step.**

🎯 **If MCP solution doesn't work (errors, bugs), THEN search the web for troubleshooting.**

🎯 **When in doubt, use `search_documentation` to find the right MCP tool.**

---

**Made for Cursor AI and other MCP-compatible agents.**
**Last updated**: October 2025

