/**
 * MCP Tools for Pubky development assistance
 * 
 * TABLE OF CONTENTS:
 * ==================
 * 
 * 1. PUBKY CORE TOOLS (lines ~810-1170)
 *    - get_pubky_concept: Explain Pubky concepts
 *    - get_code_example: Get code examples
 *    - search_documentation: Search docs
 *    - explain_capabilities: Parse capabilities
 *    - generate_app_scaffold: Create new app
 *    - get_code_template: Get templates
 *    - list_templates: List available templates
 * 
 * 2. ENVIRONMENT & SETUP TOOLS (lines ~1170-1480)
 *    - analyze_project: Analyze existing project
 *    - detect_environment: Detect installed tools
 *    - suggest_setup: Suggest setup steps
 *    - ensure_dependencies: Install dependencies
 *    - install_pubky_testnet: Install testnet
 *    - setup_project_dependencies: Add Pubky deps
 *    - verify_installation: Verify tools
 *    - adapt_to_project: Generate integration code
 *    - integrate_pubky: Add Pubky to project
 * 
 * 3. TESTNET TOOLS (lines ~1480-1560)
 *    - start_testnet: Start local testnet
 *    - stop_testnet: Stop testnet
 *    - restart_testnet: Restart testnet
 *    - check_testnet_status: Check if running
 *    - get_testnet_info: Get testnet details
 * 
 * 4. NEXUS API TOOLS (lines ~1600-1680)
 *    - query_nexus_api: Search Nexus endpoints
 *    - explain_nexus_endpoint: Explain endpoint
 *    - generate_nexus_client: Generate client code
 * 
 * 5. APP SPECS TOOLS (lines ~1680-1720)
 *    - generate_data_model: Generate model code
 *    - validate_model_data: Validate data
 *    - explain_model: Explain model rules
 *    - create_model_example: Create example
 * 
 * 6. PKARR TOOLS (lines ~1800-2460)
 *    - get_pkarr_concept: Explain Pkarr concepts
 *    - search_pkarr_docs: Search Pkarr docs
 *    - get_pkarr_example: Get Pkarr examples
 *    - generate_pkarr_client: Generate client
 *    - start_pkarr_relay: Start relay
 *    - stop_pkarr_relay: Stop relay
 *    - restart_pkarr_relay: Restart relay
 *    - check_pkarr_relay_status: Check status
 *    - get_pkarr_relay_info: Get relay info
 *    - generate_pkarr_keypair: Generate keypair
 *    - generate_dns_record_builder: Build DNS records
 *    - explain_pkarr_key: Analyze public key
 *    - install_pkarr_relay: Install relay binary
 *    - setup_pkarr_project: Add Pkarr to project
 * 
 * 7. PKDNS TOOLS (lines ~2460-2540)
 *    - get_pkdns_info: Overview and public servers
 *    - setup_pkdns_browser: Configure browser DNS
 *    - setup_pkdns_system: Configure system DNS
 *    - install_pkdns: Install pkdns binary
 * 
 * 8. NEXUS IMPLEMENTATION TOOLS (lines ~2540-2600)
 *    - get_nexus_architecture: Architecture overview
 *    - setup_nexus_dev: Development environment setup
 *    - explain_nexus_component: Component details
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { FileReader } from './utils/file-reader.js';
import { TestnetManager } from './utils/testnet.js';
import { PkarrRelayManager } from './utils/pkarr-relay.js';
import { EnvironmentDetector } from './utils/environment.js';
import { getTemplate, listTemplates, generateScaffold, templates } from './utils/templates.js';
import { NexusApiParser } from './utils/nexus-api.js';
import { AppSpecsParser } from './utils/app-specs.js';
import {
  LANGUAGES,
  CONCEPT_TYPES,
  PROJECT_TYPES,
  FRAMEWORKS,
  CAPABILITY_ACTIONS,
  APP_SPEC_MODELS,
  PKARR_CONCEPTS,
  PKARR_EXAMPLE_TYPES,
  DEFAULT_PKARR_RELAYS,
} from './constants.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// Helper functions to reduce code duplication
function createTextResponse(text: string): { content: Array<{ type: string; text: string }> } {
  return {
    content: [{ type: 'text', text }],
  };
}

export class ToolHandler {
  private testnetManager: TestnetManager;
  private pkarrRelayManager: PkarrRelayManager | null = null;
  private envDetector: EnvironmentDetector;
  private nexusParser: NexusApiParser;
  private specsParser: AppSpecsParser;

  constructor(
    private fileReader: FileReader,
    private pubkyCoreRoot: string,
    private workspaceRoot: string,
    private pkarrRoot?: string,
    private pkdnsRoot?: string,
    private nexusRoot?: string
  ) {
    this.testnetManager = new TestnetManager();
    if (pkarrRoot) {
      this.pkarrRelayManager = new PkarrRelayManager(pkarrRoot);
    }
    this.envDetector = new EnvironmentDetector();
    this.nexusParser = new NexusApiParser(workspaceRoot);
    this.specsParser = new AppSpecsParser(workspaceRoot);
  }

  listTools(): Tool[] {
    return [
      // Documentation & Learning Tools
      {
        name: 'get_pubky_concept',
        description:
          'Get detailed explanation of a Pubky concept (homeserver, rootkey, capabilities, auth, storage, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            concept: {
              type: 'string',
              description:
                'The concept to explain (e.g., "homeserver", "rootkey", "capabilities", "auth", "storage")',
            },
          },
          required: ['concept'],
        },
      },
      {
        name: 'get_code_example',
        description: 'Get a specific code example from Pubky Core examples',
        inputSchema: {
          type: 'object',
          properties: {
            language: {
              type: 'string',
              enum: [LANGUAGES.RUST, LANGUAGES.JAVASCRIPT],
              description: 'Programming language for the example',
            },
            example: {
              type: 'string',
              description: 'Example name (e.g., "auth_flow", "storage", "signup", "testnet")',
            },
          },
          required: ['language', 'example'],
        },
      },
      {
        name: 'search_documentation',
        description:
          'Search across all Pubky documentation, examples, and code for specific topics or keywords',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query or keywords',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'explain_capabilities',
        description:
          'Parse and explain Pubky capability strings, showing what permissions they grant',
        inputSchema: {
          type: 'object',
          properties: {
            capabilities: {
              type: 'string',
              description: 'Capability string (e.g., "/pub/my-app/:rw,/pub/shared/:r")',
            },
          },
          required: ['capabilities'],
        },
      },

      // Code Generation Tools
      {
        name: 'generate_app_scaffold',
        description: 'Generate a complete Pubky application scaffold with boilerplate code',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: {
              type: 'string',
              description: 'Name of the project to create',
            },
            language: {
              type: 'string',
              enum: [LANGUAGES.RUST, LANGUAGES.JAVASCRIPT, LANGUAGES.TYPESCRIPT],
              description: 'Programming language to use',
            },
            features: {
              type: 'array',
              items: { type: 'string' },
              description: 'Features to include (e.g., ["auth", "storage", "json"])',
            },
            targetPath: {
              type: 'string',
              description: 'Path where to create the project (defaults to current directory)',
            },
          },
          required: ['projectName', 'language'],
        },
      },
      {
        name: 'get_code_template',
        description: 'Get a code template for common Pubky patterns',
        inputSchema: {
          type: 'object',
          properties: {
            templateName: {
              type: 'string',
              description: 'Template name (use list_templates first to see available options)',
            },
          },
          required: ['templateName'],
        },
      },
      {
        name: 'list_templates',
        description: 'List all available code templates',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },

      // Environment & Project Analysis
      {
        name: 'analyze_project',
        description:
          'Analyze the current project structure and detect language, framework, and existing dependencies',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project to analyze (defaults to current directory)',
            },
          },
        },
      },
      {
        name: 'detect_environment',
        description:
          'Check what development tools are installed (Node.js, Rust, Cargo, npm, pubky-testnet)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'suggest_setup',
        description:
          'Analyze project and environment, then suggest what needs to be installed or configured',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project (defaults to current directory)',
            },
          },
        },
      },

      // Dependency Management
      {
        name: 'ensure_dependencies',
        description:
          'Smart installer that checks what dependencies are needed for a Pubky project and installs missing ones',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project',
            },
            autoInstall: {
              type: 'boolean',
              description: 'Automatically install without asking (default: false)',
            },
          },
          required: ['projectPath'],
        },
      },
      {
        name: 'install_pubky_testnet',
        description: 'Install the pubky-testnet binary using cargo',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'setup_project_dependencies',
        description:
          'Add Pubky dependencies to an existing project (updates package.json or Cargo.toml)',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project',
            },
          },
          required: ['projectPath'],
        },
      },
      {
        name: 'verify_installation',
        description:
          'Verify that all required tools for Pubky development are properly installed and working',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },

      // Testnet Management
      {
        name: 'start_testnet',
        description: 'Start a local Pubky testnet (DHT + homeserver + relay) for development',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'stop_testnet',
        description: 'Stop the running local testnet',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'restart_testnet',
        description: 'Restart the local testnet (useful after code changes)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'check_testnet_status',
        description: 'Check if the local testnet is running and responsive',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_testnet_info',
        description: 'Get detailed information about the testnet (public key, ports, URLs)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },

      // Pkarr Tools (Discovery Layer)
      {
        name: 'get_pkarr_concept',
        description:
          'Explain Pkarr concepts (discovery, DHT, relays, signed packets, DNS records, republishing, keypairs)',
        inputSchema: {
          type: 'object',
          properties: {
            concept: {
              type: 'string',
              description:
                'Concept to explain (e.g., "discovery", "dht", "relay", "signed-packet", "dns-records")',
            },
          },
          required: ['concept'],
        },
      },
      {
        name: 'search_pkarr_docs',
        description: 'Search Pkarr design docs and examples for specific topics',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query or keywords',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_pkarr_example',
        description:
          'Get Pkarr code examples (publish, resolve, http-serve, http-get) in Rust or JavaScript',
        inputSchema: {
          type: 'object',
          properties: {
            language: {
              type: 'string',
              enum: [LANGUAGES.RUST, LANGUAGES.JAVASCRIPT],
              description: 'Programming language',
            },
            example: {
              type: 'string',
              enum: [
                PKARR_EXAMPLE_TYPES.PUBLISH,
                PKARR_EXAMPLE_TYPES.RESOLVE,
                PKARR_EXAMPLE_TYPES.HTTP_SERVE,
                PKARR_EXAMPLE_TYPES.HTTP_GET,
              ],
              description: 'Example type',
            },
          },
          required: ['language', 'example'],
        },
      },
      {
        name: 'generate_pkarr_client',
        description: 'Generate Pkarr client code for publishing/resolving records',
        inputSchema: {
          type: 'object',
          properties: {
            language: {
              type: 'string',
              enum: [LANGUAGES.RUST, LANGUAGES.JAVASCRIPT, LANGUAGES.TYPESCRIPT],
              description: 'Programming language',
            },
            includePublish: {
              type: 'boolean',
              description: 'Include publishing functionality',
            },
            includeResolve: {
              type: 'boolean',
              description: 'Include resolving functionality',
            },
          },
          required: ['language'],
        },
      },
      {
        name: 'start_pkarr_relay',
        description: 'Start local Pkarr relay for development',
        inputSchema: {
          type: 'object',
          properties: {
            port: {
              type: 'number',
              description: 'Port number (default: 6881)',
            },
            testnet: {
              type: 'boolean',
              description: 'Run in testnet mode',
            },
          },
        },
      },
      {
        name: 'stop_pkarr_relay',
        description: 'Stop running Pkarr relay',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'restart_pkarr_relay',
        description: 'Restart Pkarr relay with new config',
        inputSchema: {
          type: 'object',
          properties: {
            port: {
              type: 'number',
              description: 'Port number (default: 6881)',
            },
            testnet: {
              type: 'boolean',
              description: 'Run in testnet mode',
            },
          },
        },
      },
      {
        name: 'check_pkarr_relay_status',
        description: 'Check if Pkarr relay is running',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_pkarr_relay_info',
        description: 'Get Pkarr relay details (URL, port, cache info)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'generate_pkarr_keypair',
        description: 'Generate code to create/manage Pkarr keypairs',
        inputSchema: {
          type: 'object',
          properties: {
            language: {
              type: 'string',
              enum: [LANGUAGES.RUST, LANGUAGES.JAVASCRIPT, LANGUAGES.TYPESCRIPT],
              description: 'Programming language',
            },
          },
          required: ['language'],
        },
      },
      {
        name: 'generate_dns_record_builder',
        description:
          'Generate code to build DNS records (A, AAAA, TXT, CNAME, NS, HTTPS, SVCB) for Pkarr',
        inputSchema: {
          type: 'object',
          properties: {
            language: {
              type: 'string',
              enum: [LANGUAGES.RUST, LANGUAGES.JAVASCRIPT, LANGUAGES.TYPESCRIPT],
              description: 'Programming language',
            },
            recordTypes: {
              type: 'array',
              items: { type: 'string' },
              description: 'DNS record types to include (e.g., ["A", "TXT", "HTTPS"])',
            },
          },
          required: ['language'],
        },
      },
      {
        name: 'explain_pkarr_key',
        description: 'Parse and explain a z-base32 Pkarr public key',
        inputSchema: {
          type: 'object',
          properties: {
            publicKey: {
              type: 'string',
              description: 'Z-base32 encoded public key',
            },
          },
          required: ['publicKey'],
        },
      },
      {
        name: 'install_pkarr_relay',
        description: 'Install pkarr-relay binary via cargo',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'setup_pkarr_project',
        description: 'Add Pkarr dependencies to existing project',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project',
            },
          },
          required: ['projectPath'],
        },
      },

      // Pkdns Tools (DNS Resolver)
      {
        name: 'get_pkdns_info',
        description: 'Get pkdns overview and how it resolves Pkarr domains as TLDs',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'setup_pkdns_browser',
        description: 'Guide to configure browser to use pkdns DNS-over-HTTPS',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'setup_pkdns_system',
        description: 'Guide to configure system DNS to use pkdns',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'install_pkdns',
        description: 'Install pkdns binary via cargo',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },

      // Nexus Implementation Tools (for developers)
      {
        name: 'get_nexus_architecture',
        description: 'Understand Nexus architecture: watcher, service, databases',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'setup_nexus_dev',
        description: 'Set up Nexus development environment (Neo4j, Redis, Docker)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'explain_nexus_component',
        description: 'Explain a specific Nexus component (watcher, service, common)',
        inputSchema: {
          type: 'object',
          properties: {
            component: {
              type: 'string',
              enum: ['watcher', 'service', 'common', 'nexusd'],
              description: 'Component to explain',
            },
          },
          required: ['component'],
        },
      },

      // Integration & Debugging
      {
        name: 'adapt_to_project',
        description:
          'Analyze existing project and generate Pubky integration code that matches the project structure and patterns',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project',
            },
          },
          required: ['projectPath'],
        },
      },
      {
        name: 'integrate_pubky',
        description:
          'Add Pubky to an existing project (detects framework, adds dependencies, generates appropriate code)',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project',
            },
          },
          required: ['projectPath'],
        },
      },

      // Nexus API Tools (for READING social data)
      {
        name: 'query_nexus_api',
        description: 'Search and query Nexus API endpoints by keyword or category. Nexus is where you READ social data (feeds, search, discovery). It crawls all homeservers and indexes public data.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term or category (posts, users, streams, search, tags)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'explain_nexus_endpoint',
        description: 'Get detailed explanation and example for a specific Nexus API endpoint. Use Nexus to read aggregated social data, not to write posts (write to your homeserver instead).',
        inputSchema: {
          type: 'object',
          properties: {
            operationId: {
              type: 'string',
              description:
                'Operation ID of the endpoint (e.g., "post_view_handler", "stream_posts_handler")',
            },
          },
          required: ['operationId'],
        },
      },
      {
        name: 'generate_nexus_client',
        description: 'Generate API client code for reading social data from Nexus (feeds, search, user discovery). Note: To write posts/profiles, use homeserver storage tools instead.',
        inputSchema: {
          type: 'object',
          properties: {
            language: {
              type: 'string',
              enum: [LANGUAGES.JAVASCRIPT, LANGUAGES.TYPESCRIPT, LANGUAGES.RUST],
              description: 'Programming language for the client',
            },
            endpoints: {
              type: 'array',
              items: { type: 'string' },
              description:
                'List of endpoint operation IDs to include (leave empty for common endpoints)',
            },
          },
          required: ['language'],
        },
      },

      // Pubky App Specs Tools (data format for WRITING to homeserver)
      {
        name: 'generate_data_model',
        description: 'Generate code for Pubky app data models with validation. Use this format when WRITING to YOUR homeserver. Nexus will automatically index it if stored in /pub/pubky.app/*',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              enum: Object.values(APP_SPEC_MODELS),
              description: 'Model name (user, post, tag, bookmark, follow, file, feed)',
            },
            language: {
              type: 'string',
              enum: [LANGUAGES.JAVASCRIPT, LANGUAGES.TYPESCRIPT, LANGUAGES.RUST],
              description: 'Programming language',
            },
          },
          required: ['model', 'language'],
        },
      },
      {
        name: 'validate_model_data',
        description: 'Validate data against Pubky app model specifications. Ensures your data follows the interoperability contract before writing to homeserver.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              enum: Object.values(APP_SPEC_MODELS),
              description: 'Model name to validate against',
            },
            data: {
              type: 'object',
              description: 'Data object to validate',
            },
          },
          required: ['model', 'data'],
        },
      },
      {
        name: 'explain_model',
        description: 'Get detailed explanation of a Pubky app data model. Understand the schema and validation rules for interoperable social data.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              enum: Object.values(APP_SPEC_MODELS),
              description: 'Model name',
            },
          },
          required: ['model'],
        },
      },
      {
        name: 'create_model_example',
        description: 'Create example data for a Pubky app model. Shows how to properly format data before writing to your homeserver.',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              enum: Object.values(APP_SPEC_MODELS),
              description: 'Model name',
            },
            language: {
              type: 'string',
              enum: [LANGUAGES.JAVASCRIPT, LANGUAGES.TYPESCRIPT, LANGUAGES.RUST],
              description: 'Programming language',
            },
          },
          required: ['model', 'language'],
        },
      },
    ];
  }

  async executeTool(
    name: string,
    args: any
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      switch (name) {
        // Documentation & Learning
        case 'get_pubky_concept':
          return await this.getPubkyConcept(args.concept);
        case 'get_code_example':
          return await this.getCodeExample(args.language, args.example);
        case 'search_documentation':
          return await this.searchDocumentation(args.query);
        case 'explain_capabilities':
          return await this.explainCapabilities(args.capabilities);

        // Code Generation
        case 'generate_app_scaffold':
          return await this.generateAppScaffold(
            args.projectName,
            args.language,
            args.features || [],
            args.targetPath
          );
        case 'get_code_template':
          return await this.getCodeTemplate(args.templateName);
        case 'list_templates':
          return await this.listCodeTemplates();

        // Environment & Analysis
        case 'analyze_project':
          return await this.analyzeProject(args.projectPath || process.cwd());
        case 'detect_environment':
          return await this.detectEnvironment();
        case 'suggest_setup':
          return await this.suggestSetup(args.projectPath || process.cwd());

        // Dependency Management
        case 'ensure_dependencies':
          return await this.ensureDependencies(args.projectPath, args.autoInstall);
        case 'install_pubky_testnet':
          return await this.installPubkyTestnet();
        case 'setup_project_dependencies':
          return await this.setupProjectDependencies(args.projectPath);
        case 'verify_installation':
          return await this.verifyInstallation();

        // Testnet Management
        case 'start_testnet':
          return await this.startTestnet();
        case 'stop_testnet':
          return await this.stopTestnet();
        case 'restart_testnet':
          return await this.restartTestnet();
        case 'check_testnet_status':
          return await this.checkTestnetStatus();
        case 'get_testnet_info':
          return await this.getTestnetInfo();

        // Pkarr Tools
        case 'get_pkarr_concept':
          return await this.getPkarrConcept(args.concept);
        case 'search_pkarr_docs':
          return await this.searchPkarrDocs(args.query);
        case 'get_pkarr_example':
          return await this.getPkarrExample(args.language, args.example);
        case 'generate_pkarr_client':
          return await this.generatePkarrClient(
            args.language,
            args.includePublish,
            args.includeResolve
          );
        case 'start_pkarr_relay':
          return await this.startPkarrRelay(args.port, args.testnet);
        case 'stop_pkarr_relay':
          return await this.stopPkarrRelay();
        case 'restart_pkarr_relay':
          return await this.restartPkarrRelay(args.port, args.testnet);
        case 'check_pkarr_relay_status':
          return await this.checkPkarrRelayStatus();
        case 'get_pkarr_relay_info':
          return await this.getPkarrRelayInfo();
        case 'generate_pkarr_keypair':
          return await this.generatePkarrKeypair(args.language);
        case 'generate_dns_record_builder':
          return await this.generateDnsRecordBuilder(args.language, args.recordTypes);
        case 'explain_pkarr_key':
          return await this.explainPkarrKey(args.publicKey);
        case 'install_pkarr_relay':
          return await this.installPkarrRelay();
        case 'setup_pkarr_project':
          return await this.setupPkarrProject(args.projectPath);

        // Pkdns Tools
        case 'get_pkdns_info':
          return await this.getPkdnsInfo();
        case 'setup_pkdns_browser':
          return await this.setupPkdnsBrowser();
        case 'setup_pkdns_system':
          return await this.setupPkdnsSystem();
        case 'install_pkdns':
          return await this.installPkdns();

        // Nexus Implementation Tools
        case 'get_nexus_architecture':
          return await this.getNexusArchitecture();
        case 'setup_nexus_dev':
          return await this.setupNexusDev();
        case 'explain_nexus_component':
          return await this.explainNexusComponent(args.component);

        // Integration
        case 'adapt_to_project':
          return await this.adaptToProject(args.projectPath);
        case 'integrate_pubky':
          return await this.integratePubky(args.projectPath);

        // Nexus API
        case 'query_nexus_api':
          return await this.queryNexusApi(args.query);
        case 'explain_nexus_endpoint':
          return await this.explainNexusEndpoint(args.operationId);
        case 'generate_nexus_client':
          return await this.generateNexusClient(args.language, args.endpoints || []);

        // Pubky App Specs
        case 'generate_data_model':
          return await this.generateDataModel(args.model, args.language);
        case 'validate_model_data':
          return await this.validateModelData(args.model, args.data);
        case 'explain_model':
          return await this.explainModel(args.model);
        case 'create_model_example':
          return await this.createModelExample(args.model, args.language);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error executing ${name}: ${error.message}`,
          },
        ],
      };
    }
  }

  // ============================================================================
  // 1. PUBKY CORE TOOLS
  // ============================================================================
  // Concepts, examples, auth, storage, capabilities
  
  private async getPubkyConcept(
    concept: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const conceptLower = concept.toLowerCase();

    try {
      switch (true) {
        case conceptLower.includes(CONCEPT_TYPES.HOMESERVER): {
          const content = await this.fileReader.readDocFile('src/concepts/homeserver.md');
          const readme = await this.fileReader.readFile(
            path.join(this.pubkyCoreRoot, 'pubky-homeserver/README.md')
          );
          return {
            content: [
              {
                type: 'text',
                text: `# Homeserver Concept\n\n${content}\n\n---\n\n# Homeserver Implementation\n\n${readme}`,
              },
            ],
          };
        }
        case conceptLower.includes('root') || conceptLower.includes('key'): {
          const content = await this.fileReader.readDocFile('src/concepts/rootkey.md');
          return {
            content: [{ type: 'text', text: content }],
          };
        }
        case conceptLower.includes(CONCEPT_TYPES.AUTH) || conceptLower.includes('authentication'): {
          const content = await this.fileReader.readDocFile('src/spec/auth.md');
          return {
            content: [{ type: 'text', text: content }],
          };
        }
        case conceptLower.includes(CONCEPT_TYPES.CAPABILITIES): {
          const capFile = await this.fileReader.readFile(
            path.join(this.pubkyCoreRoot, 'pubky-common/src/capabilities.rs')
          );
          return {
            content: [
              {
                type: 'text',
                text: `# Capabilities\n\nCapabilities define what a session can access and how.\n\n## Implementation\n\n\`\`\`rust\n${capFile}\n\`\`\``,
              },
            ],
          };
        }
        case conceptLower.includes(CONCEPT_TYPES.STORAGE): {
          const sdkReadme = await this.fileReader.readFile(
            path.join(this.pubkyCoreRoot, 'pubky-sdk/README.md')
          );
          return {
            content: [
              {
                type: 'text',
                text: `# Storage\n\nPubky provides a key-value storage API through HTTP.\n\n${sdkReadme}`,
              },
            ],
          };
        }
        default:
          // General search
          return await this.searchDocumentation(concept);
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Could not find information about "${concept}". Try: homeserver, rootkey, auth, capabilities, or storage.`,
          },
        ],
      };
    }
  }

  private async getCodeExample(
    language: 'rust' | 'javascript',
    example: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const examplePath =
      language === 'rust'
        ? this.fileReader.getPaths().examplesRust
        : this.fileReader.getPaths().examplesJs;

    // Map common names to actual directories
    const exampleMap: Record<string, string> = {
      auth: '3-auth_flow',
      auth_flow: '3-auth_flow',
      authentication: '3-auth_flow',
      storage: '4-storage',
      signup: '2-signup',
      testnet: '1-testnet',
      logging: '0-logging',
      request: '5-request',
    };

    const actualExample = exampleMap[example.toLowerCase()] || example;

    try {
      const readme = await this.fileReader.readFile(
        path.join(examplePath, actualExample, 'README.md')
      );

      // Try to get code files
      let code = '';
      try {
        if (language === 'rust') {
          const mainFile = await this.fileReader.readFile(
            path.join(examplePath, actualExample, 'main.rs')
          );
          code = `\n\n## Code (main.rs)\n\n\`\`\`rust\n${mainFile}\n\`\`\``;
        } else {
          const files = await this.fileReader.listDirectory(path.join(examplePath, actualExample));
          const jsFile = files.find(f => f.endsWith('.mjs') || f.endsWith('.js'));
          if (jsFile) {
            const content = await this.fileReader.readFile(
              path.join(examplePath, actualExample, jsFile)
            );
            code = `\n\n## Code (${jsFile})\n\n\`\`\`javascript\n${content}\n\`\`\``;
          }
        }
      } catch {
        // No code file found
      }

      return {
        content: [
          {
            type: 'text',
            text: `${readme}${code}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Could not find example "${example}". Available examples: auth_flow, storage, signup, testnet, logging, request`,
          },
        ],
      };
    }
  }

  private async searchDocumentation(
    query: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const docsPath = this.fileReader.getPaths().docs;
    const examplesPath = this.fileReader.getPaths().examples;

    const results = await this.fileReader.searchFiles(docsPath, query);
    const exampleResults = await this.fileReader.searchFiles(examplesPath, query);

    // Also search Nexus API and App Specs
    let nexusResults = '';
    let specsResults = '';
    
    try {
      nexusResults = await this.nexusParser.searchEndpoints(query);
    } catch {
      // Nexus search failed, skip
    }

    try {
      specsResults = await this.specsParser.searchModels(query);
    } catch {
      // Specs search failed, skip
    }

    let output = `# Search Results for "${query}"\n\n`;

    let foundAny = results.length > 0 || exampleResults.length > 0 || nexusResults.length > 0 || specsResults.length > 0;

    if (!foundAny) {
      output += 'No results found.';
    } else {
      if (results.length > 0) {
        output += `## Pubky Core Documentation (${results.length} matches)\n\n`;
        for (const result of results.slice(0, 10)) {
          output += `### ${result.path}\n\n`;
          for (const match of result.matches) {
            output += `- ${match}\n`;
          }
          output += '\n';
        }
      }

      if (exampleResults.length > 0) {
        output += `\n## Pubky Core Examples (${exampleResults.length} matches)\n\n`;
        for (const result of exampleResults.slice(0, 10)) {
          output += `### ${result.path}\n\n`;
          for (const match of result.matches) {
            output += `- ${match}\n`;
          }
          output += '\n';
        }
      }

      if (nexusResults && !nexusResults.includes('No endpoints found')) {
        output += `\n## Nexus API\n\n${nexusResults}\n\n`;
      }

      if (specsResults && !specsResults.includes('No matches found')) {
        output += `\n## Pubky App Specs\n\n${specsResults}\n\n`;
      }
    }

    return {
      content: [{ type: 'text', text: output }],
    };
  }

  private async explainCapabilities(
    capabilities: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const caps = capabilities.split(',').map(c => c.trim());

    let explanation = `# Capabilities Explanation\n\nYou provided: \`${capabilities}\`\n\n`;

    for (const cap of caps) {
      const [scope, actions] = cap.split(':');
      explanation += `## \`${cap}\`\n\n`;
      explanation += `- **Scope**: \`${scope}\`\n`;
      explanation += `- **Actions**: \`${actions || 'none'}\`\n\n`;

      if (actions) {
        if (actions.includes('r')) {
          explanation += `- ✓ **Read** (GET): Can read files in ${scope}\n`;
        }
        if (actions.includes('w')) {
          explanation += `- ✓ **Write** (PUT/POST/DELETE): Can write/modify/delete files in ${scope}\n`;
        }
      }

      explanation += `\n`;

      // Add best practices
      if (scope === '/') {
        explanation += `⚠️ **Warning**: This grants access to the entire storage! Consider being more specific.\n\n`;
      } else if (!scope.startsWith('/pub/')) {
        explanation += `⚠️ **Note**: Non-public paths (not under /pub/) may have restricted access.\n\n`;
      }
    }

    explanation += `\n## How to use in code\n\n`;
    explanation += `### JavaScript\n\`\`\`javascript\nimport { Capabilities } from '@synonymdev/pubky';\n\n`;
    explanation += `const caps = Capabilities.builder()\n`;
    for (const cap of caps) {
      const [scope, actions] = cap.split(':');
      switch (true) {
        case actions === CAPABILITY_ACTIONS.READ_WRITE:
          explanation += `  .readWrite('${scope}')\n`;
          break;
        case actions === CAPABILITY_ACTIONS.READ:
          explanation += `  .read('${scope}')\n`;
          break;
        case actions === CAPABILITY_ACTIONS.WRITE:
          explanation += `  .write('${scope}')\n`;
          break;
      }
    }
    explanation += `  .finish();\n\`\`\`\n\n`;

    explanation += `### Rust\n\`\`\`rust\nuse pubky::prelude::*;\n\n`;
    explanation += `let caps = Capabilities::builder()\n`;
    for (const cap of caps) {
      const [scope, actions] = cap.split(':');
      switch (true) {
        case actions === CAPABILITY_ACTIONS.READ_WRITE:
          explanation += `    .read_write("${scope}")\n`;
          break;
        case actions === CAPABILITY_ACTIONS.READ:
          explanation += `    .read("${scope}")\n`;
          break;
        case actions === CAPABILITY_ACTIONS.WRITE:
          explanation += `    .write("${scope}")\n`;
          break;
      }
    }
    explanation += `    .finish();\n\`\`\`\n`;

    return {
      content: [{ type: 'text', text: explanation }],
    };
  }

  private async generateAppScaffold(
    projectName: string,
    language: 'rust' | 'javascript' | 'typescript',
    features: string[],
    targetPath?: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const scaffold = generateScaffold(projectName, language, features);
    const projectPath = path.join(targetPath || process.cwd(), projectName);

    try {
      // Create project directory
      await fs.mkdir(projectPath, { recursive: true });

      // Create all files
      for (const [filePath, content] of scaffold.files) {
        const fullPath = path.join(projectPath, filePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, 'utf-8');
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ Project scaffold created successfully!\n\n${scaffold.instructions}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error creating scaffold: ${error.message}`,
          },
        ],
      };
    }
  }

  private async getCodeTemplate(
    templateName: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const template = getTemplate(templateName);

    if (!template) {
      const available = listTemplates();
      return {
        content: [
          {
            type: 'text',
            text: `Template "${templateName}" not found.\n\nAvailable templates:\n${available.map(t => `- ${t.name}: ${t.description}`).join('\n')}`,
          },
        ],
      };
    }

    let output = `# ${template.name}\n\n${template.description}\n\n`;
    output += `**Language**: ${template.language}\n\n`;

    if (template.dependencies && template.dependencies.length > 0) {
      output += `**Dependencies**:\n${template.dependencies.map(d => `- ${d}`).join('\n')}\n\n`;
    }

    output += `## Code\n\n\`\`\`${template.language}\n${template.code}\n\`\`\``;

    return {
      content: [{ type: 'text', text: output }],
    };
  }

  private async listCodeTemplates(): Promise<{ content: Array<{ type: string; text: string }> }> {
    const templates = listTemplates();

    let output = '# Available Code Templates\n\n';

    const byLanguage: Record<string, typeof templates> = {};
    for (const template of templates) {
      if (!byLanguage[template.language]) {
        byLanguage[template.language] = [];
      }
      byLanguage[template.language].push(template);
    }

    for (const [language, temps] of Object.entries(byLanguage)) {
      output += `## ${language.charAt(0).toUpperCase() + language.slice(1)}\n\n`;
      for (const template of temps) {
        output += `- **${template.name}**: ${template.description}\n`;
      }
      output += '\n';
    }

    return {
      content: [{ type: 'text', text: output }],
    };
  }

  // ============================================================================
  // 2. ENVIRONMENT & SETUP TOOLS
  // ============================================================================
  // Project analysis, dependency management, installation

  private async analyzeProject(
    projectPath: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const analysis = await this.envDetector.analyzeProject(projectPath);

    let output = `# Project Analysis\n\n`;
    output += `**Path**: ${projectPath}\n`;
    output += `**Type**: ${analysis.type}\n`;
    output += `**Has Pubky**: ${analysis.hasPubkyDependency ? '✅ Yes' : '❌ No'}\n\n`;

    if (analysis.framework) {
      output += `**Framework**: ${analysis.framework}\n\n`;
    }

    if (analysis.dependencies.length > 0) {
      output += `**Dependencies** (${analysis.dependencies.length}):\n`;
      for (const dep of analysis.dependencies.slice(0, 10)) {
        output += `- ${dep}\n`;
      }
      if (analysis.dependencies.length > 10) {
        output += `- ... and ${analysis.dependencies.length - 10} more\n`;
      }
      output += '\n';
    }

    return {
      content: [{ type: 'text', text: output }],
    };
  }

  private async detectEnvironment(): Promise<{ content: Array<{ type: string; text: string }> }> {
    const env = await this.envDetector.detect();

    let output = `# Environment Detection\n\n`;
    output += `**OS**: ${env.os}\n`;
    output += `**Architecture**: ${env.arch}\n\n`;

    output += `## Installed Tools\n\n`;

    if (env.node) {
      output += `✅ **Node.js**: ${env.node.version} (${env.node.path})\n`;
    } else {
      output += `❌ **Node.js**: Not installed\n`;
    }

    if (env.npm) {
      output += `✅ **npm**: ${env.npm.version} (${env.npm.path})\n`;
    } else {
      output += `❌ **npm**: Not installed\n`;
    }

    if (env.rust) {
      output += `✅ **Rust**: ${env.rust.version} (${env.rust.path})\n`;
    } else {
      output += `❌ **Rust**: Not installed\n`;
    }

    if (env.cargo) {
      output += `✅ **Cargo**: ${env.cargo.version} (${env.cargo.path})\n`;
    } else {
      output += `❌ **Cargo**: Not installed\n`;
    }

    if (env.pubkyTestnet?.installed) {
      output += `✅ **pubky-testnet**: Installed (${env.pubkyTestnet.path})\n`;
    } else {
      output += `❌ **pubky-testnet**: Not installed\n`;
    }

    return {
      content: [{ type: 'text', text: output }],
    };
  }

  private async suggestSetup(
    projectPath: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const env = await this.envDetector.detect();
    const analysis = await this.envDetector.analyzeProject(projectPath);

    let output = `# Setup Suggestions\n\n`;

    const missing: string[] = [];
    const suggestions: string[] = [];

    // Check based on project type
    switch (true) {
      case analysis.type === PROJECT_TYPES.RUST: {
        if (!env.cargo) {
          missing.push('Rust/Cargo');
          suggestions.push('Install Rust: https://rustup.rs/');
        }
        if (!analysis.hasPubkyDependency) {
          suggestions.push('Add Pubky to Cargo.toml: `pubky = "0.4"`');
        }
        break;
      }
      case analysis.type === PROJECT_TYPES.JAVASCRIPT ||
        analysis.type === PROJECT_TYPES.TYPESCRIPT: {
        if (!env.node) {
          missing.push('Node.js');
          suggestions.push('Install Node.js: https://nodejs.org/');
        }
        if (!env.npm) {
          missing.push('npm');
          suggestions.push('Install npm (usually comes with Node.js)');
        }
        if (!analysis.hasPubkyDependency) {
          suggestions.push('Install Pubky SDK: `npm install @synonymdev/pubky`');
        }
        break;
      }
    }

    // Testnet recommendation
    if (!env.pubkyTestnet?.installed) {
      suggestions.push(
        'Install pubky-testnet for local development: `cargo install pubky-testnet`'
      );
    }

    if (missing.length > 0) {
      output += `## ❌ Missing Required Tools\n\n`;
      for (const tool of missing) {
        output += `- ${tool}\n`;
      }
      output += '\n';
    }

    if (suggestions.length > 0) {
      output += `## 💡 Recommendations\n\n`;
      for (const suggestion of suggestions) {
        output += `- ${suggestion}\n`;
      }
    } else {
      output += `✅ Everything looks good! You're ready to develop with Pubky.\n`;
    }

    return {
      content: [{ type: 'text', text: output }],
    };
  }

  private async ensureDependencies(
    projectPath: string,
    autoInstall: boolean = false
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const analysis = await this.envDetector.analyzeProject(projectPath);

    let output = `# Ensuring Dependencies\n\n`;

    if (analysis.hasPubkyDependency) {
      output += `✅ Pubky is already installed in this project.\n`;
      return { content: [{ type: 'text', text: output }] };
    }

    if (!autoInstall) {
      output += `Pubky is not installed. Use \`setup_project_dependencies\` to add it.\n`;
      return { content: [{ type: 'text', text: output }] };
    }

    try {
      switch (true) {
        case analysis.type === PROJECT_TYPES.RUST: {
          await this.envDetector.addCargodependency(projectPath);
          output += `✅ Added pubky to Cargo.toml\n`;
          break;
        }
        case analysis.hasPackageJson: {
          const result = await this.envDetector.installNpmPackage(projectPath);
          output += `✅ Installed @synonymdev/pubky\n\n${result}\n`;
          break;
        }
      }
    } catch (error: any) {
      output += `❌ Error: ${error.message}\n`;
    }

    return {
      content: [{ type: 'text', text: output }],
    };
  }

  private async installPubkyTestnet(): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const result = await this.envDetector.installPubkyTestnet();
      return {
        content: [
          {
            type: 'text',
            text: `✅ Successfully installed pubky-testnet!\n\n${result}\n\nYou can now run it with: \`pubky-testnet\``,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to install pubky-testnet: ${error.message}\n\nMake sure you have Rust and Cargo installed.`,
          },
        ],
      };
    }
  }

  private async setupProjectDependencies(
    projectPath: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const analysis = await this.envDetector.analyzeProject(projectPath);

    let output = `# Setting up Pubky Dependencies\n\n`;

    try {
      switch (true) {
        case analysis.type === PROJECT_TYPES.RUST: {
          if (analysis.hasCargoToml) {
            await this.envDetector.addCargodependency(projectPath);
            output += `✅ Added pubky to Cargo.toml\n\nRun \`cargo build\` to download the dependency.`;
          } else {
            output += `❌ No Cargo.toml found. This doesn't appear to be a Rust project.`;
          }
          break;
        }
        case analysis.type === PROJECT_TYPES.JAVASCRIPT ||
          analysis.type === PROJECT_TYPES.TYPESCRIPT: {
          if (analysis.hasPackageJson) {
            const result = await this.envDetector.installNpmPackage(projectPath);
            output += `✅ Installed @synonymdev/pubky\n\n${result}`;
          } else {
            output += `❌ No package.json found. Run \`npm init\` first.`;
          }
          break;
        }
        default:
          output += `❌ Unknown project type. Cannot determine how to add dependencies.`;
      }
    } catch (error: any) {
      output += `❌ Error: ${error.message}`;
    }

    return {
      content: [{ type: 'text', text: output }],
    };
  }

  private async verifyInstallation(): Promise<{ content: Array<{ type: string; text: string }> }> {
    const env = await this.envDetector.detect();

    let output = `# Installation Verification\n\n`;
    let allGood = true;

    const checks = [
      { name: 'Node.js', installed: !!env.node, required: false },
      { name: 'npm', installed: !!env.npm, required: false },
      { name: 'Rust', installed: !!env.rust, required: false },
      { name: 'Cargo', installed: !!env.cargo, required: false },
      { name: 'pubky-testnet', installed: env.pubkyTestnet?.installed || false, required: false },
    ];

    for (const check of checks) {
      if (check.installed) {
        output += `✅ ${check.name}: Installed\n`;
      } else {
        output += `${check.required ? '❌' : '⚠️'} ${check.name}: Not installed${check.required ? ' (required)' : ''}\n`;
        if (check.required) allGood = false;
      }
    }

    output += `\n`;

    if (allGood) {
      output += `✅ All checks passed! You're ready for Pubky development.\n`;
    } else {
      output += `⚠️ Some tools are missing. Install them based on your needs:\n`;
      output += `- For JavaScript/TypeScript: Install Node.js and npm\n`;
      output += `- For Rust: Install Rust and Cargo from https://rustup.rs/\n`;
      output += `- For local testing: Install pubky-testnet with \`cargo install pubky-testnet\`\n`;
    }

    return {
      content: [{ type: 'text', text: output }],
    };
  }

  // ============================================================================
  // 3. TESTNET TOOLS
  // ============================================================================
  // Local development testnet management
  
  private async startTestnet(): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const result = await this.testnetManager.start(this.pubkyCoreRoot);
      return createTextResponse(result);
    } catch (error: any) {
      return createTextResponse(
        `Failed to start testnet: ${error.message}\n\nMake sure pubky-testnet is installed or run from the pubky-core directory.`
      );
    }
  }

  private async stopTestnet(): Promise<{ content: Array<{ type: string; text: string }> }> {
    const result = await this.testnetManager.stop();
    return createTextResponse(result);
  }

  private async restartTestnet(): Promise<{ content: Array<{ type: string; text: string }> }> {
    const result = await this.testnetManager.restart(this.pubkyCoreRoot);
    return createTextResponse(result);
  }

  private async checkTestnetStatus(): Promise<{ content: Array<{ type: string; text: string }> }> {
    const isRunning = await this.testnetManager.isRunning();
    const status = isRunning ? '✅ Testnet is running' : '❌ Testnet is not running';

    if (isRunning) {
      const info = await this.testnetManager.getInfo();
      return {
        content: [
          {
            type: 'text',
            text: `${status}\n\nHomeserver: ${info.urls.homeserver}\nPublic Key: ${info.homeserverPublicKey}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `${status}\n\nStart it with the \`start_testnet\` tool.`,
        },
      ],
    };
  }

  private async getTestnetInfo(): Promise<{ content: Array<{ type: string; text: string }> }> {
    const info = await this.testnetManager.getInfo();

    let output = `# Testnet Information\n\n`;
    output += `**Status**: ${info.isRunning ? '✅ Running' : '❌ Not running'}\n\n`;
    output += `**Homeserver Public Key**: \`${info.homeserverPublicKey}\`\n\n`;
    output += `## Ports\n\n`;
    output += `- DHT: ${info.ports.dht}\n`;
    output += `- Pkarr Relay: ${info.ports.pkarrRelay}\n`;
    output += `- HTTP Relay: ${info.ports.httpRelay}\n`;
    output += `- Admin Server: ${info.ports.adminServer}\n\n`;
    output += `## URLs\n\n`;
    output += `- Homeserver: ${info.urls.homeserver}\n`;
    output += `- HTTP Relay: ${info.urls.httpRelay}\n`;
    output += `- Admin: ${info.urls.admin}\n\n`;
    output += `## Usage in Code\n\n`;
    output += `### JavaScript\n\`\`\`javascript\nconst pubky = Pubky.testnet();\n\`\`\`\n\n`;
    output += `### Rust\n\`\`\`rust\nlet pubky = Pubky::testnet()?;\n\`\`\``;

    return {
      content: [{ type: 'text', text: output }],
    };
  }

  private async adaptToProject(
    projectPath: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const analysis = await this.envDetector.analyzeProject(projectPath);

    let output = `# Pubky Integration for Your Project\n\n`;
    output += `Based on your ${analysis.type} project${analysis.framework ? ` using ${analysis.framework}` : ''}, here's how to integrate Pubky:\n\n`;

    switch (true) {
      case analysis.type === PROJECT_TYPES.RUST: {
        output += `## 1. Add Dependency\n\nAdd to your Cargo.toml:\n\`\`\`toml\n[dependencies]\npubky = "0.4"\ntokio = { version = "1", features = ["full"] }\n\`\`\`\n\n`;
        output += `## 2. Basic Integration\n\n\`\`\`rust\n${templates['rust-basic-app'].code}\n\`\`\`\n\n`;
        break;
      }
      case analysis.framework === FRAMEWORKS.REACT: {
        output += `## 1. Install Package\n\n\`\`\`bash\nnpm install @synonymdev/pubky\n\`\`\`\n\n`;
        output += `## 2. Create Pubky Context\n\n\`\`\`typescript\nimport { createContext, useContext, useState } from 'react';\nimport { Pubky, PubkySession } from '@synonymdev/pubky';\n\nconst PubkyContext = createContext<{ pubky: Pubky; session: PubkySession | null }>({ pubky: new Pubky(), session: null });\n\nexport function PubkyProvider({ children }: { children: React.ReactNode }) {\n  const [pubky] = useState(() => new Pubky());\n  const [session, setSession] = useState<PubkySession | null>(null);\n  \n  return (\n    <PubkyContext.Provider value={{ pubky, session }}>\n      {children}\n    </PubkyContext.Provider>\n  );\n}\n\nexport const usePubky = () => useContext(PubkyContext);\n\`\`\`\n\n`;
        break;
      }
      default: {
        output += `## 1. Install Package\n\n\`\`\`bash\nnpm install @synonymdev/pubky\n\`\`\`\n\n`;
        output += `## 2. Basic Integration\n\n\`\`\`${analysis.type}\n${templates['js-basic-app'].code}\n\`\`\`\n\n`;
        break;
      }
    }

    return {
      content: [{ type: 'text', text: output }],
    };
  }

  private async integratePubky(
    projectPath: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    // This would actually add files and modify project
    // For now, we'll suggest what to do
    return await this.adaptToProject(projectPath);
  }

  // ============================================================================
  // 4. NEXUS API TOOLS
  // ============================================================================
  // Social data querying, API exploration, client generation
  
  private async queryNexusApi(
    query: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const result = await this.nexusParser.searchEndpoints(query);
    return createTextResponse(result);
  }

  private async explainNexusEndpoint(
    operationId: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const example = await this.nexusParser.generateEndpointExample(operationId);
    return createTextResponse(example);
  }

  private async generateNexusClient(
    language: string,
    endpoints: string[]
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    let output = `# Nexus API Client\n\n`;
    output += `Generated client for ${language}\n\n`;

    if (language === 'javascript' || language === 'typescript') {
      output += `\`\`\`${language}\n`;
      output += `const NEXUS_API_URL = 'https://nexus.example.com';\n\n`;
      output += `class NexusClient {\n`;
      output += `  constructor(apiUrl = NEXUS_API_URL) {\n`;
      output += `    this.apiUrl = apiUrl;\n`;
      output += `  }\n\n`;

      const commonEndpoints = endpoints.length > 0 ? endpoints : ['post_view_handler', 'stream_posts_handler', 'user_view_handler'];

      for (const operationId of commonEndpoints) {
        try {
          const example = await this.nexusParser.generateEndpointExample(operationId);
          // Extract just the function from the example
          const functionMatch = example.match(/async function[\s\S]*?}\n/);
          if (functionMatch) {
            output += `  ${functionMatch[0]}\n`;
          }
        } catch {
          // Skip if endpoint not found
        }
      }

      output += `}\n\n`;
      output += `export default NexusClient;\n`;
      output += `\`\`\`\n`;
    } else if (language === 'rust') {
      output += `\`\`\`rust\n`;
      output += `use reqwest;\nuse serde::{Deserialize, Serialize};\n\n`;
      output += `pub struct NexusClient {\n`;
      output += `    api_url: String,\n`;
      output += `    client: reqwest::Client,\n`;
      output += `}\n\n`;
      output += `impl NexusClient {\n`;
      output += `    pub fn new(api_url: impl Into<String>) -> Self {\n`;
      output += `        Self {\n`;
      output += `            api_url: api_url.into(),\n`;
      output += `            client: reqwest::Client::new(),\n`;
      output += `        }\n`;
      output += `    }\n\n`;
      output += `    pub async fn get_post(&self, author_id: &str, post_id: &str) -> Result<serde_json::Value, reqwest::Error> {\n`;
      output += `        let url = format!("{}/v0/post/{}/{}", self.api_url, author_id, post_id);\n`;
      output += `        self.client.get(&url).send().await?.json().await\n`;
      output += `    }\n`;
      output += `}\n`;
      output += `\`\`\`\n`;
    }

    return {
      content: [{ type: 'text', text: output }],
    };
  }

  // ============================================================================
  // 5. APP SPECS TOOLS
  // ============================================================================
  // Data model generation, validation, examples
  
  private async generateDataModel(
    model: string,
    language: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const example = await this.specsParser.generateModelExample(model, language as any);
    return createTextResponse(example);
  }

  private async validateModelData(
    model: string,
    data: any
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const validation = await this.specsParser.validateModelData(model, data);
    return createTextResponse(validation);
  }

  private async explainModel(
    model: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const info = await this.specsParser.getModelInfo(model);
    return createTextResponse(info);
  }

  private async createModelExample(
    model: string,
    language: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const example = await this.specsParser.generateModelExample(model, language as any);
    return createTextResponse(example);
  }

  // ============================================================================
  // 6. PKARR TOOLS (Discovery Layer)
  // ============================================================================
  // Public-Key Addressable Resource Records: DNS, DHT, relay management
  
  private async getPkarrConcept(
    concept: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const conceptMap: Record<string, { doc: string; description: string }> = {
      discovery: {
        doc: 'base',
        description: 'How Pkarr enables discovery of homeservers via public keys',
      },
      dht: {
        doc: 'base',
        description: 'Mainline DHT - the 10M node distributed hash table powering Pkarr',
      },
      relay: {
        doc: 'relays',
        description: 'HTTP relay servers for web apps and browsers',
      },
      'signed-packet': {
        doc: 'base',
        description: 'Cryptographically signed DNS packets published to DHT',
      },
      'dns-records': {
        doc: 'base',
        description: 'DNS resource records (A, AAAA, TXT, CNAME, NS, HTTPS, SVCB)',
      },
      republishing: {
        doc: 'base',
        description: 'Keeping records alive by periodic republishing',
      },
      keypair: {
        doc: 'base',
        description: 'Ed25519 keypairs for signing and verifying records',
      },
      mainline: {
        doc: 'base',
        description: 'Mainline DHT (BEP44) - the backbone of Pkarr',
      },
    };

    const info = conceptMap[concept.toLowerCase()] || conceptMap['discovery'];
    const designDoc = await this.fileReader.readPkarrDesignDoc(info.doc);

    let output = `# Pkarr Concept: ${concept}\n\n`;
    output += `${info.description}\n\n`;
    output += `---\n\n`;
    output += designDoc;

    return {
      content: [{ type: 'text', text: output }],
    };
  }

  private async searchPkarrDocs(
    query: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const pkarrPaths = this.fileReader.getPkarrPaths();
    if (!pkarrPaths) {
      return {
        content: [{ type: 'text', text: 'Pkarr resources not available' }],
      };
    }

    const results = await this.fileReader.searchFiles(pkarrPaths.root, query);

    let output = `# Search Results for "${query}"\n\n`;
    output += `Found ${results.length} ${results.length === 1 ? 'file' : 'files'} matching your query:\n\n`;

    for (const result of results) {
      const relativePath = result.path.replace(pkarrPaths.root, '');
      output += `## ${relativePath}\n\n`;
      for (const match of result.matches) {
        output += `- ${match}\n`;
      }
      output += `\n`;
    }

    if (results.length === 0) {
      output += `No matches found. Try searching for:\n`;
      output += `- "publish" - Publishing records\n`;
      output += `- "resolve" - Resolving public keys\n`;
      output += `- "relay" - Relay configuration\n`;
      output += `- "DHT" - Distributed Hash Table\n`;
    }

    return {
      content: [{ type: 'text', text: output }],
    };
  }

  private async getPkarrExample(
    language: string,
    example: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (language === 'rust') {
      const exampleContent = await this.fileReader.readPkarrExample(example);
      const readmeContent = await this.fileReader.readPkarrFile('pkarr/examples/README.md');

      let output = `# Pkarr ${example} Example (Rust)\n\n`;
      output += readmeContent + '\n\n';
      output += `## Source Code\n\n\`\`\`rust\n${exampleContent}\n\`\`\`\n`;

      return {
        content: [{ type: 'text', text: output }],
      };
    } else {
      // JavaScript
      const pkgReadme = await this.fileReader.readPkarrJsBindings('pkg/README.md');
      const exampleJs = await this.fileReader.readPkarrJsBindings('pkg/example.js');

      let output = `# Pkarr JavaScript Examples\n\n`;
      output += pkgReadme + '\n\n';
      output += `## Example Code\n\n\`\`\`javascript\n${exampleJs}\n\`\`\`\n`;

      return {
        content: [{ type: 'text', text: output }],
      };
    }
  }

  private async generatePkarrClient(
    language: string,
    includePublish?: boolean,
    includeResolve?: boolean
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const shouldPublish = includePublish !== false;
    const shouldResolve = includeResolve !== false;

    let output = `# Pkarr Client - ${language}\n\n`;

    if (language === 'javascript' || language === 'typescript') {
      const isTs = language === 'typescript';
      output += `\`\`\`${language}\n`;
      output += `${isTs ? "import { Client, Keypair, SignedPacket } from 'pkarr';\n\n" : "const { Client, Keypair, SignedPacket } = require('pkarr');\n\n"}`;
      output += `class PkarrClient {\n`;
      output += `  ${isTs ? 'private client: Client;\n  ' : ''}constructor(relays${isTs ? ': string[]' : ''} = ['${DEFAULT_PKARR_RELAYS[0]}', '${DEFAULT_PKARR_RELAYS[1]}']) {\n`;
      output += `    this.client = new Client(relays);\n`;
      output += `  }\n\n`;

      if (shouldPublish) {
        output += `  async publish(keypair${isTs ? ': Keypair' : ''}, records${isTs ? ': { name: string; value: string; ttl: number }[]' : ''})${isTs ? ': Promise<void>' : ''} {\n`;
        output += `    const builder = SignedPacket.builder();\n`;
        output += `    for (const record of records) {\n`;
        output += `      builder.addTxtRecord(record.name, record.value, record.ttl);\n`;
        output += `    }\n`;
        output += `    const packet = builder.buildAndSign(keypair);\n`;
        output += `    await this.client.publish(packet);\n`;
        output += `  }\n\n`;
      }

      if (shouldResolve) {
        output += `  async resolve(publicKey${isTs ? ': string' : ''})${isTs ? ': Promise<SignedPacket | null>' : ''} {\n`;
        output += `    return await this.client.resolve(publicKey);\n`;
        output += `  }\n\n`;
      }

      output += `}\n\n`;
      output += `${isTs ? 'export default PkarrClient;\n' : 'module.exports = PkarrClient;\n'}`;
      output += `\`\`\`\n`;
    } else {
      // Rust
      output += `\`\`\`rust\n`;
      output += `use pkarr::{Client, Keypair, SignedPacket};\nuse std::error::Error;\n\n`;
      output += `pub struct PkarrClient {\n`;
      output += `    client: Client,\n`;
      output += `}\n\n`;
      output += `impl PkarrClient {\n`;
      output += `    pub fn new() -> Self {\n`;
      output += `        Self {\n`;
      output += `            client: Client::default(),\n`;
      output += `        }\n`;
      output += `    }\n\n`;

      if (shouldPublish) {
        output += `    pub async fn publish(&self, keypair: &Keypair, packet: &SignedPacket) -> Result<(), Box<dyn Error>> {\n`;
        output += `        self.client.publish(packet).await?;\n`;
        output += `        Ok(())\n`;
        output += `    }\n\n`;
      }

      if (shouldResolve) {
        output += `    pub async fn resolve(&self, public_key: &str) -> Result<Option<SignedPacket>, Box<dyn Error>> {\n`;
        output += `        let packet = self.client.resolve(public_key).await?;\n`;
        output += `        Ok(packet)\n`;
        output += `    }\n\n`;
      }

      output += `}\n`;
      output += `\`\`\`\n`;
    }

    return {
      content: [{ type: 'text', text: output }],
    };
  }

  private async startPkarrRelay(
    port?: number,
    testnet?: boolean
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.pkarrRelayManager) {
      return {
        content: [
          {
            type: 'text',
            text: 'Pkarr relay manager not available. Make sure Pkarr resources are installed.',
          },
        ],
      };
    }

    try {
      const config = { port, testnet };
      const result = await this.pkarrRelayManager.start(config);
      return {
        content: [{ type: 'text', text: result }],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to start Pkarr relay: ${error.message}\n\nMake sure Rust and Cargo are installed.`,
          },
        ],
      };
    }
  }

  private async stopPkarrRelay(): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.pkarrRelayManager) {
      return createTextResponse('Pkarr relay manager not available');
    }

    const result = await this.pkarrRelayManager.stop();
    return createTextResponse(result);
  }

  private async restartPkarrRelay(
    port?: number,
    testnet?: boolean
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.pkarrRelayManager) {
      return {
        content: [{ type: 'text', text: 'Pkarr relay manager not available' }],
      };
    }

    const config = { port, testnet };
    const result = await this.pkarrRelayManager.restart(config);
    return {
      content: [{ type: 'text', text: result }],
    };
  }

  private async checkPkarrRelayStatus(): Promise<{
    content: Array<{ type: string; text: string }>;
  }> {
    if (!this.pkarrRelayManager) {
      return {
        content: [{ type: 'text', text: 'Pkarr relay manager not available' }],
      };
    }

    const isRunning = await this.pkarrRelayManager.isRunning();
    const status = isRunning ? '✅ Pkarr relay is running' : '❌ Pkarr relay is not running';

    if (isRunning) {
      const info = await this.pkarrRelayManager.getInfo();
      return {
        content: [
          {
            type: 'text',
            text: `${status}\n\nURL: ${info.url}\nPort: ${info.port}${info.testnet ? '\nMode: Testnet' : ''}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `${status}\n\nStart it with the \`start_pkarr_relay\` tool.`,
        },
      ],
    };
  }

  private async getPkarrRelayInfo(): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!this.pkarrRelayManager) {
      return {
        content: [{ type: 'text', text: 'Pkarr relay manager not available' }],
      };
    }

    const info = await this.pkarrRelayManager.getInfo();

    let output = `# Pkarr Relay Information\n\n`;
    output += `**Status**: ${info.running ? '✅ Running' : '❌ Not running'}\n\n`;

    if (info.running) {
      output += `**URL**: ${info.url}\n`;
      output += `**Port**: ${info.port}\n`;
      if (info.cacheLocation) {
        output += `**Cache Location**: ${info.cacheLocation}\n`;
      }
      if (info.testnet) {
        output += `**Mode**: Testnet\n`;
      }
      output += `\n## Usage in Code\n\n`;
      output += `### JavaScript\n\`\`\`javascript\nconst client = new Client(['${info.url}']);\n\`\`\`\n\n`;
      output += `### Rust\n\`\`\`rust\nlet client = Client::builder().relay("${info.url}").build();\n\`\`\`\n`;
    } else {
      output += `Start the relay with \`start_pkarr_relay\` tool.\n`;
    }

    return {
      content: [{ type: 'text', text: output }],
    };
  }

  private async generatePkarrKeypair(
    language: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    let output = `# Generate Pkarr Keypair - ${language}\n\n`;

    if (language === 'javascript' || language === 'typescript') {
      const isTs = language === 'typescript';
      output += `\`\`\`${language}\n`;
      output += `${isTs ? "import { Keypair } from 'pkarr';\n\n" : "const { Keypair } = require('pkarr');\n\n"}`;
      output += `// Generate a new random keypair\n`;
      output += `const keypair = new Keypair();\n\n`;
      output += `// Get the public key (z-base32 encoded)\n`;
      output += `const publicKey = keypair.public_key_string();\n`;
      output += `console.log('Public Key:', publicKey);\n\n`;
      output += `// Get secret key bytes (save securely!)\n`;
      output += `const secretBytes = keypair.secret_key_bytes();\n\n`;
      output += `// Recreate keypair from secret key later\n`;
      output += `// const restoredKeypair = Keypair.from_secret_key(secretBytes);\n`;
      output += `\`\`\`\n`;
    } else {
      // Rust
      output += `\`\`\`rust\n`;
      output += `use pkarr::Keypair;\n\n`;
      output += `// Generate a new random keypair\n`;
      output += `let keypair = Keypair::random();\n\n`;
      output += `// Get the public key\n`;
      output += `let public_key = keypair.public_key();\n`;
      output += `println!("Public Key: {}", public_key);\n\n`;
      output += `// Get secret key bytes (save securely!)\n`;
      output += `let secret_bytes = keypair.secret_key().to_bytes();\n\n`;
      output += `// Recreate keypair from secret key later\n`;
      output += `// let restored_keypair = Keypair::from_secret_key(&secret_bytes)?;\n`;
      output += `\`\`\`\n`;
    }

    output += `\n⚠️ **Important**: Store the secret key securely! Anyone with access to it can update your DNS records.\n`;

    return {
      content: [{ type: 'text', text: output }],
    };
  }

  private async generateDnsRecordBuilder(
    language: string,
    recordTypes?: string[]
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const types = recordTypes || ['A', 'TXT', 'HTTPS'];

    let output = `# DNS Record Builder - ${language}\n\n`;
    output += `Building ${types.join(', ')} records\n\n`;

    if (language === 'javascript' || language === 'typescript') {
      const isTs = language === 'typescript';
      output += `\`\`\`${language}\n`;
      output += `${isTs ? "import { SignedPacket, Keypair } from 'pkarr';\n\n" : "const { SignedPacket, Keypair } = require('pkarr');\n\n"}`;
      output += `const builder = SignedPacket.builder();\n\n`;

      for (const type of types) {
        switch (type.toUpperCase()) {
          case 'A':
            output += `// Add A record (IPv4)\n`;
            output += `builder.addARecord("www", "192.168.1.1", 3600);\n\n`;
            break;
          case 'AAAA':
            output += `// Add AAAA record (IPv6)\n`;
            output += `builder.addAAAARecord("www", "2001:db8::1", 3600);\n\n`;
            break;
          case 'TXT':
            output += `// Add TXT record\n`;
            output += `builder.addTxtRecord("_service", "pkarr=v1.0", 3600);\n\n`;
            break;
          case 'CNAME':
            output += `// Add CNAME record\n`;
            output += `builder.addCnameRecord("alias", "www", 3600);\n\n`;
            break;
          case 'HTTPS':
            output += `// Add HTTPS record with service parameters\n`;
            output += `builder.addHttpsRecord("@", 1, ".", 3600, {\n`;
            output += `  port: 443,\n`;
            output += `  ipv4hint: "192.168.1.1",\n`;
            output += `  alpn: ["h2", "http/1.1"]\n`;
            output += `});\n\n`;
            break;
        }
      }

      output += `// Build and sign\n`;
      output += `const keypair = new Keypair();\n`;
      output += `const packet = builder.buildAndSign(keypair);\n`;
      output += `\`\`\`\n`;
    } else {
      // Rust
      output += `\`\`\`rust\n`;
      output += `use pkarr::{SignedPacket, Keypair};\n`;
      output += `use simple_dns::{Name, CLASS, ResourceRecord, rdata::*};\n\n`;
      output += `let mut packet = SignedPacket::new(&keypair)?;\n\n`;

      for (const type of types) {
        switch (type.toUpperCase()) {
          case 'A':
            output += `// Add A record (IPv4)\n`;
            output += `packet.add_answer(ResourceRecord::new(\n`;
            output += `    Name::new_unchecked("www"),\n`;
            output += `    CLASS::IN,\n`;
            output += `    3600,\n`;
            output += `    A { address: [192, 168, 1, 1] }\n`;
            output += `));\n\n`;
            break;
          case 'TXT':
            output += `// Add TXT record\n`;
            output += `packet.add_answer(ResourceRecord::new(\n`;
            output += `    Name::new_unchecked("_service"),\n`;
            output += `    CLASS::IN,\n`;
            output += `    3600,\n`;
            output += `    TXT::new().with_string("pkarr=v1.0")\n`;
            output += `));\n\n`;
            break;
        }
      }

      output += `\`\`\`\n`;
    }

    return {
      content: [{ type: 'text', text: output }],
    };
  }

  private async explainPkarrKey(
    publicKey: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    let output = `# Pkarr Public Key Analysis\n\n`;
    output += `**Key**: \`${publicKey}\`\n\n`;

    // Basic validation
    if (publicKey.length !== 52) {
      output += `⚠️ **Warning**: Standard Pkarr keys are 52 characters (z-base32 encoded ed25519 public keys)\n\n`;
    }

    output += `## Key Properties\n\n`;
    output += `- **Encoding**: z-base32 (base32 with alternative alphabet)\n`;
    output += `- **Key Type**: Ed25519 public key (32 bytes)\n`;
    output += `- **Length**: ${publicKey.length} characters\n\n`;

    output += `## Usage\n\n`;
    output += `This key can be used as:\n\n`;
    output += `1. **Top-Level Domain**: \`https://${publicKey}\`\n`;
    output += `2. **DHT Key**: Lookup signed packets from Mainline DHT\n`;
    output += `3. **Verification**: Verify signatures on DNS packets\n\n`;

    output += `## Resolve This Key\n\n`;
    output += `### JavaScript\n\`\`\`javascript\n`;
    output += `const client = new Client();\n`;
    output += `const packet = await client.resolve("${publicKey}");\n`;
    output += `if (packet) {\n`;
    output += `  console.log('Records:', packet.records);\n`;
    output += `}\n`;
    output += `\`\`\`\n\n`;

    output += `### Rust\n\`\`\`rust\n`;
    output += `let client = Client::default();\n`;
    output += `if let Some(packet) = client.resolve("${publicKey}").await? {\n`;
    output += `    println!("Records: {:?}", packet);\n`;
    output += `}\n`;
    output += `\`\`\`\n`;

    return {
      content: [{ type: 'text', text: output }],
    };
  }

  private async installPkarrRelay(): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const { stdout, stderr } = await execAsync('cargo install pkarr-relay', {
        timeout: 300000, // 5 minutes
      });

      let output = `✅ Pkarr relay installed successfully!\n\n`;
      output += `Installation output:\n${stdout}\n${stderr}\n\n`;
      output += `You can now start the relay with the \`start_pkarr_relay\` tool.`;

      return {
        content: [{ type: 'text', text: output }],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to install pkarr-relay: ${error.message}\n\nMake sure Rust and Cargo are installed:\nhttps://rustup.rs/`,
          },
        ],
      };
    }
  }

  private async setupPkarrProject(
    projectPath: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const analysis = await this.envDetector.analyzeProject(projectPath);

    let output = `# Add Pkarr to Your Project\n\n`;

    switch (analysis.type) {
      case PROJECT_TYPES.RUST: {
        output += `## Add Dependency\n\nAdd to your Cargo.toml:\n\`\`\`toml\n[dependencies]\npkarr = "5.0"\n\`\`\`\n\n`;
        output += `## Basic Usage\n\n\`\`\`rust\n`;
        output += `use pkarr::{Client, Keypair, SignedPacket};\n\n`;
        output += `#[tokio::main]\nasync fn main() -> Result<(), Box<dyn std::error::Error>> {\n`;
        output += `    let keypair = Keypair::random();\n`;
        output += `    let client = Client::default();\n`;
        output += `    \n`;
        output += `    // Publish records\n`;
        output += `    let packet = SignedPacket::new(&keypair)?;\n`;
        output += `    client.publish(&packet).await?;\n`;
        output += `    \n`;
        output += `    Ok(())\n`;
        output += `}\n\`\`\`\n`;
        break;
      }
      case PROJECT_TYPES.JAVASCRIPT:
      case PROJECT_TYPES.TYPESCRIPT: {
        output += `## Install Package\n\n\`\`\`bash\nnpm install pkarr\n\`\`\`\n\n`;
        output += `## Basic Usage\n\n\`\`\`${analysis.type}\n`;
        if (analysis.type === 'typescript') {
          output += `import { Client, Keypair, SignedPacket } from 'pkarr';\n\n`;
        } else {
          output += `const { Client, Keypair, SignedPacket } = require('pkarr');\n\n`;
        }
        output += `const keypair = new Keypair();\n`;
        output += `const client = new Client();\n\n`;
        output += `// Publish records\n`;
        output += `const builder = SignedPacket.builder();\n`;
        output += `builder.addTxtRecord("_service", "myapp=v1", 3600);\n`;
        output += `const packet = builder.buildAndSign(keypair);\n`;
        output += `await client.publish(packet);\n\n`;
        output += `// Resolve records\n`;
        output += `const resolved = await client.resolve(keypair.public_key_string());\n`;
        output += `console.log(resolved.records);\n`;
        output += `\`\`\`\n`;
        break;
      }
      default:
        output += `Project type not detected. Install Pkarr manually:\n\n`;
        output += `**JavaScript/TypeScript**: \`npm install pkarr\`\n`;
        output += `**Rust**: Add \`pkarr = "5.0"\` to Cargo.toml\n`;
    }

    return {
      content: [{ type: 'text', text: output }],
    };
  }

  // ============================================================================
  // 7. PKDNS TOOLS (DNS Resolver for Pkarr Domains)
  // ============================================================================
  // Browser/system DNS setup, server installation

  private async getPkdnsInfo(): Promise<{ content: Array<{ type: string; text: string }> }> {
    const readme = await this.fileReader.readPkdnsFile('README.md');
    const servers = await this.fileReader.readPkdnsFile('servers.txt');

    let output = `# Pkdns - DNS Resolver for Pkarr Domains\n\n`;
    output += readme + '\n\n';
    output += `## Public Pkdns Servers\n\n\`\`\`\n${servers}\n\`\`\`\n`;

    return createTextResponse(output);
  }

  private async setupPkdnsBrowser(): Promise<{ content: Array<{ type: string; text: string }> }> {
    const dohDoc = await this.fileReader.readPkdnsDoc('dns-over-https');

    let output = `# Configure Your Browser for Pkdns\n\n`;
    output += dohDoc + '\n\n';
    output += `## Quick Setup\n\n`;
    output += `1. Pick a DNS-over-HTTPS server from public list\n`;
    output += `2. Open browser settings\n`;
    output += `3. Find "DNS over HTTPS" or "Secure DNS"\n`;
    output += `4. Enter the DoH URL\n\n`;
    output += `## Test It\n\n`;
    output += `Visit: http://7fmjpcuuzf54hw18bsgi3zihzyh4awseeuq5tmojefaezjbd64cy/\n`;

    return createTextResponse(output);
  }

  private async setupPkdnsSystem(): Promise<{ content: Array<{ type: string; text: string }> }> {
    const readme = await this.fileReader.readPkdnsFile('README.md');

    let output = `# Configure System DNS for Pkdns\n\n`;
    output += `## Why?\n\n`;
    output += `Makes Pkarr domains work system-wide in all applications.\n\n`;
    output += `## Steps\n\n`;
    output += `1. Find a public pkdns server IP (use \`get_pkdns_info\` tool)\n`;
    output += `2. Add it to your system DNS settings\n\n`;
    output += `### macOS\n`;
    output += `System Preferences → Network → Advanced → DNS → Add server IP\n\n`;
    output += `### Linux (Ubuntu)\n`;
    output += `\`\`\`bash\n`;
    output += `sudo nano /etc/resolv.conf\n`;
    output += `# Add: nameserver YOUR_PKDNS_IP\n`;
    output += `\`\`\`\n\n`;
    output += `### Windows\n`;
    output += `Control Panel → Network → Change adapter settings → Properties → IPv4 → DNS\n\n`;
    output += `## Test It\n\n`;
    output += `\`\`\`bash\n`;
    output += `nslookup 7fmjpcuuzf54hw18bsgi3zihzyh4awseeuq5tmojefaezjbd64cy\n`;
    output += `\`\`\`\n`;

    return createTextResponse(output);
  }

  private async installPkdns(): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const { stdout, stderr } = await execAsync('cargo install --git https://github.com/pubky/pkdns pkdns', {
        timeout: 300000, // 5 minutes
      });

      return createTextResponse(
        `✅ Pkdns installed successfully!\n\n${stdout}\n${stderr}\n\nRun with: \`pkdns --verbose\`\n\nThen configure your browser or system DNS.`
      );
    } catch (error: any) {
      return createTextResponse(
        `Failed to install pkdns: ${error.message}\n\nMake sure Rust and Cargo are installed:\nhttps://rustup.rs/`
      );
    }
  }

  // ============================================================================
  // 8. NEXUS IMPLEMENTATION TOOLS (For Advanced Users)
  // ============================================================================
  // Architecture understanding, development setup, component details

  private async getNexusArchitecture(): Promise<{ content: Array<{ type: string; text: string }> }> {
    const readme = await this.fileReader.readNexusFile('README.md');
    const docsReadme = await this.fileReader.readNexusDoc('readme.md');

    let output = `# Pubky Nexus Architecture\n\n`;
    output += `## Overview\n\n${readme}\n\n`;
    output += `## Detailed Architecture\n\n${docsReadme}\n\n`;
    output += `## Components\n\n`;
    output += `- **nexus-watcher**: Event aggregator (listens to homeservers)\n`;
    output += `- **nexus-service**: REST API server\n`;
    output += `- **nexus-common**: Shared database and models\n`;
    output += `- **nexusd**: Daemon manager\n\n`;
    output += `Use \`explain_nexus_component\` tool to learn more about each component.`;

    return createTextResponse(output);
  }

  private async setupNexusDev(): Promise<{ content: Array<{ type: string; text: string }> }> {
    const readme = await this.fileReader.readNexusFile('README.md');

    let output = `# Set Up Nexus Development Environment\n\n`;
    output += `Nexus requires Neo4j (graph database) and Redis (cache).\n\n`;
    output += `## Quick Start\n\n`;
    output += `\`\`\`bash\n`;
    output += `cd /path/to/pubky-nexus\n`;
    output += `cd docker\n`;
    output += `cp .env-sample .env\n`;
    output += `docker compose up -d\n`;
    output += `\`\`\`\n\n`;
    output += `## Run Nexus\n\n`;
    output += `\`\`\`bash\n`;
    output += `cargo run -p nexusd\n`;
    output += `# Or run components separately:\n`;
    output += `cargo run -p nexusd -- watcher\n`;
    output += `cargo run -p nexusd -- api\n`;
    output += `\`\`\`\n\n`;
    output += `## Access UIs\n\n`;
    output += `- Swagger API: http://localhost:8080/swagger-ui\n`;
    output += `- Redis Insight: http://localhost:8001/redis-stack/browser\n`;
    output += `- Neo4j Browser: http://localhost:7474/browser/\n\n`;
    output += `See full README for testing, benchmarking, and migrations.`;

    return createTextResponse(output);
  }

  private async explainNexusComponent(
    component: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const componentMap: Record<string, 'common' | 'watcher' | 'webapi'> = {
      common: 'common',
      watcher: 'watcher',
      service: 'webapi',
      webapi: 'webapi',
      nexusd: 'common', // Fallback
    };

    const comp = componentMap[component] || 'common';
    const content = await this.fileReader.readNexusComponentReadme(comp);

    return createTextResponse(`# Nexus Component: ${component}\n\n${content}`);
  }
}
