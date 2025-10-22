#!/usr/bin/env node
/**
 * Pubky MCP Server
 *
 * Model Context Protocol server that provides comprehensive Pubky protocol knowledge,
 * code examples, and development tools for building Pubky applications.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { FileReader } from './utils/file-reader.js';
import { ResourceHandler } from './resources.js';
import { ToolHandler } from './tools.js';
import { PromptHandler } from './prompts.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module (works in ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Point to bundled data directory (dist/../data after build)
const DATA_ROOT = path.join(__dirname, '..', 'data');
const PUBKY_CORE_ROOT = path.join(DATA_ROOT, 'pubky-core');
const WORKSPACE_ROOT = DATA_ROOT;

// Initialize handlers
const fileReader = new FileReader(PUBKY_CORE_ROOT);
const resourceHandler = new ResourceHandler(fileReader, WORKSPACE_ROOT);
const toolHandler = new ToolHandler(fileReader, PUBKY_CORE_ROOT, WORKSPACE_ROOT);
const promptHandler = new PromptHandler();

// Create MCP server
const server = new Server(
  {
    name: 'pubky-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

// Error handler
server.onerror = error => {
  console.error('[MCP Error]', error);
};

// Handle process errors
process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.close();
  process.exit(0);
});

// List resources handler
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  try {
    const resources = await resourceHandler.listResources();
    return { resources };
  } catch (error) {
    console.error('Error listing resources:', error);
    return { resources: [] };
  }
});

// Read resource handler
server.setRequestHandler(ReadResourceRequestSchema, async request => {
  try {
    const { uri } = request.params;
    return await resourceHandler.getResource(uri);
  } catch (error: any) {
    console.error('Error reading resource:', error);
    throw new Error(`Failed to read resource: ${error.message}`);
  }
});

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  try {
    const tools = toolHandler.listTools();
    return { tools };
  } catch (error) {
    console.error('Error listing tools:', error);
    return { tools: [] };
  }
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async request => {
  try {
    const { name, arguments: args } = request.params;
    return await toolHandler.executeTool(name, args || {});
  } catch (error: any) {
    console.error('Error executing tool:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
    };
  }
});

// List prompts handler
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  try {
    const prompts = promptHandler.listPrompts();
    return { prompts };
  } catch (error) {
    console.error('Error listing prompts:', error);
    return { prompts: [] };
  }
});

// Get prompt handler
server.setRequestHandler(GetPromptRequestSchema, async request => {
  try {
    const { name, arguments: args } = request.params;
    return await promptHandler.getPrompt(name, args || {});
  } catch (error: any) {
    console.error('Error getting prompt:', error);
    throw new Error(`Failed to get prompt: ${error.message}`);
  }
});

// Start the server
async function main() {
  console.error('🚀 Pubky MCP Server starting...');
  console.error(`📂 Data path: ${DATA_ROOT}`);

  // Verify bundled data exists
  try {
    await fileReader.fileExists(path.join(PUBKY_CORE_ROOT, 'README.md'));
    console.error('✅ Bundled resources found');
  } catch (error) {
    console.error(`⚠️  Warning: Bundled resources not found at ${DATA_ROOT}`);
    console.error('Please run: npm run fetch-resources');
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('✅ Pubky MCP Server running');
  console.error('');
  console.error('📦 Available capabilities:');
  console.error('  • Resources: Documentation, API specs, code examples');
  console.error('  • Tools: Code generation, validation, testnet management');
  console.error('  • Prompts: Interactive guides for building on Pubky');
  console.error('');
  console.error('🔺 Hub-Spoke Architecture:');
  console.error('  • Your Homeserver (pubky-core) - WHERE you WRITE data');
  console.error('  • App Specs (pubky-app-specs) - WHAT format to use');
  console.error('  • Nexus Indexer (nexus-webapi) - WHERE you READ social data');
  console.error('');
  console.error('💡 Key Concept:');
  console.error('   Write to YOUR homeserver → Nexus indexes it → Read from Nexus');
  console.error('');
  console.error('Your complete Pubky ecosystem expert is ready! 🎉');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
