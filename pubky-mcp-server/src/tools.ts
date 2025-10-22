/**
 * MCP Tools for Pubky development assistance
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { FileReader } from './utils/file-reader.js';
import { TestnetManager } from './utils/testnet.js';
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
} from './constants.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ToolHandler {
  private testnetManager: TestnetManager;
  private envDetector: EnvironmentDetector;
  private nexusParser: NexusApiParser;
  private specsParser: AppSpecsParser;

  constructor(
    private fileReader: FileReader,
    private pubkyCoreRoot: string,
    private workspaceRoot: string
  ) {
    this.testnetManager = new TestnetManager();
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

  // Implementation methods
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

  // Testnet methods
  private async startTestnet(): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const result = await this.testnetManager.start(this.pubkyCoreRoot);
      return {
        content: [{ type: 'text', text: result }],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to start testnet: ${error.message}\n\nMake sure pubky-testnet is installed or run from the pubky-core directory.`,
          },
        ],
      };
    }
  }

  private async stopTestnet(): Promise<{ content: Array<{ type: string; text: string }> }> {
    const result = await this.testnetManager.stop();
    return {
      content: [{ type: 'text', text: result }],
    };
  }

  private async restartTestnet(): Promise<{ content: Array<{ type: string; text: string }> }> {
    const result = await this.testnetManager.restart(this.pubkyCoreRoot);
    return {
      content: [{ type: 'text', text: result }],
    };
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

  // Nexus API methods
  private async queryNexusApi(
    query: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const result = await this.nexusParser.searchEndpoints(query);
    return {
      content: [{ type: 'text', text: result }],
    };
  }

  private async explainNexusEndpoint(
    operationId: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const example = await this.nexusParser.generateEndpointExample(operationId);
    return {
      content: [{ type: 'text', text: example }],
    };
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

  // Pubky App Specs methods
  private async generateDataModel(
    model: string,
    language: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const example = await this.specsParser.generateModelExample(model, language as any);
    return {
      content: [{ type: 'text', text: example }],
    };
  }

  private async validateModelData(
    model: string,
    data: any
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const validation = await this.specsParser.validateModelData(model, data);
    return {
      content: [{ type: 'text', text: validation }],
    };
  }

  private async explainModel(
    model: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const info = await this.specsParser.getModelInfo(model);
    return {
      content: [{ type: 'text', text: info }],
    };
  }

  private async createModelExample(
    model: string,
    language: string
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const example = await this.specsParser.generateModelExample(model, language as any);
    return {
      content: [{ type: 'text', text: example }],
    };
  }
}
