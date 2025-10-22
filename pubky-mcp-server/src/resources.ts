/**
 * MCP Resources for Pubky documentation and examples
 */

import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { FileReader } from './utils/file-reader.js';
import { RESOURCE_TYPES, DOC_SECTIONS, API_SECTIONS, APP_SPEC_MODELS } from './constants.js';
import { NexusApiParser } from './utils/nexus-api.js';
import { AppSpecsParser } from './utils/app-specs.js';
import * as path from 'path';

export class ResourceHandler {
  private nexusParser: NexusApiParser;
  private specsParser: AppSpecsParser;

  constructor(
    private fileReader: FileReader,
    workspaceRoot: string
  ) {
    this.nexusParser = new NexusApiParser(workspaceRoot);
    this.specsParser = new AppSpecsParser(workspaceRoot);
  }

  async listResources(): Promise<Resource[]> {
    return [
      // Documentation resources
      {
        uri: 'pubky://docs/overview',
        name: 'Pubky Protocol Overview',
        mimeType: 'text/markdown',
        description: 'Overview of the Pubky protocol and its features',
      },
      {
        uri: 'pubky://docs/concepts/rootkey',
        name: 'Root Key Concept',
        mimeType: 'text/markdown',
        description: 'Understanding Pubky root keys and identity',
      },
      {
        uri: 'pubky://docs/concepts/homeserver',
        name: 'Homeserver Concept',
        mimeType: 'text/markdown',
        description: 'Understanding Pubky homeservers',
      },
      {
        uri: 'pubky://docs/auth',
        name: 'Authentication Flow',
        mimeType: 'text/markdown',
        description: 'Pubky Auth protocol and 3rd party authorization',
      },

      // Example resources
      {
        uri: 'pubky://examples/rust/all',
        name: 'All Rust Examples',
        mimeType: 'text/markdown',
        description: 'Complete list of Rust examples',
      },
      {
        uri: 'pubky://examples/javascript/all',
        name: 'All JavaScript Examples',
        mimeType: 'text/markdown',
        description: 'Complete list of JavaScript examples',
      },

      // API references
      {
        uri: 'pubky://api/homeserver',
        name: 'Homeserver API Reference',
        mimeType: 'text/markdown',
        description: 'HTTP API endpoints provided by Pubky homeserver',
      },
      {
        uri: 'pubky://api/sdk',
        name: 'SDK API Reference',
        mimeType: 'text/markdown',
        description: 'Pubky SDK API documentation',
      },
      {
        uri: 'pubky://api/capabilities',
        name: 'Capabilities Reference',
        mimeType: 'text/markdown',
        description: 'Complete guide to Pubky capabilities and permissions',
      },

      // Nexus API resources
      {
        uri: 'pubky://api/nexus/overview',
        name: 'Nexus API Overview',
        mimeType: 'text/markdown',
        description: 'Overview of the Nexus social API',
      },
      {
        uri: 'pubky://api/nexus/endpoints/posts',
        name: 'Nexus Post Endpoints',
        mimeType: 'text/markdown',
        description: 'Post-related API endpoints',
      },
      {
        uri: 'pubky://api/nexus/endpoints/users',
        name: 'Nexus User Endpoints',
        mimeType: 'text/markdown',
        description: 'User-related API endpoints',
      },
      {
        uri: 'pubky://api/nexus/endpoints/streams',
        name: 'Nexus Stream Endpoints',
        mimeType: 'text/markdown',
        description: 'Stream and feed API endpoints',
      },
      {
        uri: 'pubky://api/nexus/endpoints/search',
        name: 'Nexus Search Endpoints',
        mimeType: 'text/markdown',
        description: 'Search API endpoints',
      },
      {
        uri: 'pubky://api/nexus/endpoints/tags',
        name: 'Nexus Tag Endpoints',
        mimeType: 'text/markdown',
        description: 'Tag-related API endpoints',
      },
      {
        uri: 'pubky://api/nexus/schemas',
        name: 'Nexus API Schemas',
        mimeType: 'text/markdown',
        description: 'All data schemas from Nexus API',
      },

      // Pubky App Specs resources
      {
        uri: 'pubky://specs/overview',
        name: 'Pubky App Specs Overview',
        mimeType: 'text/markdown',
        description: 'Overview of Pubky app data model specifications',
      },
      {
        uri: 'pubky://specs/models/user',
        name: 'PubkyAppUser Model',
        mimeType: 'text/markdown',
        description: 'User profile data model specification',
      },
      {
        uri: 'pubky://specs/models/post',
        name: 'PubkyAppPost Model',
        mimeType: 'text/markdown',
        description: 'Post data model specification',
      },
      {
        uri: 'pubky://specs/models/tag',
        name: 'PubkyAppTag Model',
        mimeType: 'text/markdown',
        description: 'Tag data model specification',
      },
      {
        uri: 'pubky://specs/models/bookmark',
        name: 'PubkyAppBookmark Model',
        mimeType: 'text/markdown',
        description: 'Bookmark data model specification',
      },
      {
        uri: 'pubky://specs/models/follow',
        name: 'PubkyAppFollow Model',
        mimeType: 'text/markdown',
        description: 'Follow relationship data model specification',
      },
      {
        uri: 'pubky://specs/models/file',
        name: 'PubkyAppFile Model',
        mimeType: 'text/markdown',
        description: 'File metadata data model specification',
      },
      {
        uri: 'pubky://specs/models/feed',
        name: 'PubkyAppFeed Model',
        mimeType: 'text/markdown',
        description: 'Feed configuration data model specification',
      },
      {
        uri: 'pubky://specs/examples',
        name: 'Pubky App Specs Examples',
        mimeType: 'text/markdown',
        description: 'JavaScript usage examples for all data models',
      },
    ];
  }

  async getResource(
    uri: string
  ): Promise<{ contents: { uri: string; mimeType: string; text: string }[] }> {
    // Parse the URI
    const uriPath = uri.replace('pubky://', '');
    const parts = uriPath.split('/');

    try {
      switch (true) {
        case parts[0] === RESOURCE_TYPES.DOCS:
          return await this.getDocResource(parts.slice(1));
        case parts[0] === RESOURCE_TYPES.EXAMPLES:
          return await this.getExampleResource(parts.slice(1));
        case parts[0] === RESOURCE_TYPES.API:
          return await this.getApiResource(parts.slice(1));
        case parts[0] === RESOURCE_TYPES.SPECS:
          return await this.getSpecsResource(parts.slice(1));
        default:
          throw new Error(`Unknown resource type: ${parts[0]}`);
      }
    } catch (error: any) {
      throw new Error(`Failed to load resource ${uri}: ${error.message}`);
    }
  }

  private async getDocResource(
    parts: string[]
  ): Promise<{ contents: { uri: string; mimeType: string; text: string }[] }> {
    const paths = this.fileReader.getPaths();

    switch (true) {
      case parts[0] === DOC_SECTIONS.OVERVIEW: {
        const overview = await this.fileReader.readDocFile('src/overview.md');
        const readme = await this.fileReader.readFile(path.join(paths.root, 'README.md'));
        return {
          contents: [
            {
              uri: 'pubky://docs/overview',
              mimeType: 'text/markdown',
              text: `# Pubky Protocol Overview\n\n${readme}\n\n---\n\n${overview}`,
            },
          ],
        };
      }
      case parts[0] === DOC_SECTIONS.CONCEPTS: {
        const conceptFile = parts[1] === 'rootkey' ? 'rootkey.md' : 'homeserver.md';
        const content = await this.fileReader.readDocFile(`src/concepts/${conceptFile}`);
        return {
          contents: [
            {
              uri: `pubky://docs/concepts/${parts[1]}`,
              mimeType: 'text/markdown',
              text: content,
            },
          ],
        };
      }
      case parts[0] === DOC_SECTIONS.AUTH: {
        const content = await this.fileReader.readDocFile('src/spec/auth.md');
        return {
          contents: [
            {
              uri: 'pubky://docs/auth',
              mimeType: 'text/markdown',
              text: content,
            },
          ],
        };
      }
      default:
        throw new Error(`Unknown doc resource: ${parts.join('/')}`);
    }
  }

  private async getExampleResource(
    parts: string[]
  ): Promise<{ contents: { uri: string; mimeType: string; text: string }[] }> {
    const language = parts[0] as 'rust' | 'javascript';
    const paths = this.fileReader.getPaths();

    if (parts[1] === 'all') {
      const examplePath = language === 'rust' ? paths.examplesRust : paths.examplesJs;
      const readme = await this.fileReader.readFile(path.join(examplePath, 'README.md'));

      // List all example directories
      const entries = await this.fileReader.listDirectory(examplePath);
      const examples = entries.filter(
        e => !e.startsWith('.') && e !== 'README.md' && e !== 'Cargo.toml' && e !== 'package.json'
      );

      let content = `# ${language === 'rust' ? 'Rust' : 'JavaScript'} Examples\n\n${readme}\n\n## Available Examples\n\n`;

      for (const example of examples) {
        try {
          const exampleReadme = await this.fileReader.readExampleFile(
            language,
            `${example}/README.md`
          );
          content += `### ${example}\n\n${exampleReadme}\n\n---\n\n`;
        } catch {
          // Skip if no README
        }
      }

      return {
        contents: [
          {
            uri: `pubky://examples/${language}/all`,
            mimeType: 'text/markdown',
            text: content,
          },
        ],
      };
    } else {
      // Specific example
      const exampleName = parts[1];
      const readme = await this.fileReader.readExampleFile(language, `${exampleName}/README.md`);

      // Try to get the main code file
      let codeContent = '';
      try {
        const codeFile =
          language === 'rust'
            ? await this.fileReader.readExampleFile(language, `${exampleName}/main.rs`)
            : await this.fileReader.readExampleFile(language, `${exampleName}.mjs`);
        codeContent = `\n\n## Code\n\n\`\`\`${language === 'rust' ? 'rust' : 'javascript'}\n${codeFile}\n\`\`\``;
      } catch {
        // No code file found
      }

      return {
        contents: [
          {
            uri: `pubky://examples/${language}/${exampleName}`,
            mimeType: 'text/markdown',
            text: `${readme}${codeContent}`,
          },
        ],
      };
    }
  }

  private async getApiResource(
    parts: string[]
  ): Promise<{ contents: { uri: string; mimeType: string; text: string }[] }> {
    const paths = this.fileReader.getPaths();

    switch (true) {
      case parts[0] === API_SECTIONS.HOMESERVER: {
        const readme = await this.fileReader.readFile(
          path.join(paths.root, 'pubky-homeserver/README.md')
        );
        const routesInfo = await this.generateHomeserverApiDocs();

        return {
          contents: [
            {
              uri: 'pubky://api/homeserver',
              mimeType: 'text/markdown',
              text: `# Pubky Homeserver API\n\n${readme}\n\n---\n\n${routesInfo}`,
            },
          ],
        };
      }
      case parts[0] === API_SECTIONS.SDK: {
        const readme = await this.fileReader.readFile(path.join(paths.root, 'pubky-sdk/README.md'));

        return {
          contents: [
            {
              uri: 'pubky://api/sdk',
              mimeType: 'text/markdown',
              text: readme,
            },
          ],
        };
      }
      case parts[0] === API_SECTIONS.CAPABILITIES: {
        const capabilitiesCode = await this.fileReader.readFile(
          path.join(paths.root, 'pubky-common/src/capabilities.rs')
        );

        return {
          contents: [
            {
              uri: 'pubky://api/capabilities',
              mimeType: 'text/markdown',
              text: `# Pubky Capabilities Reference\n\n\`\`\`rust\n${capabilitiesCode}\n\`\`\``,
            },
          ],
        };
      }
      case parts[0] === API_SECTIONS.NEXUS: {
        return await this.getNexusApiResource(parts.slice(1));
      }
      default:
        throw new Error(`Unknown API resource: ${parts.join('/')}`);
    }
  }

  private async getNexusApiResource(
    parts: string[]
  ): Promise<{ contents: { uri: string; mimeType: string; text: string }[] }> {
    if (parts[0] === 'overview') {
      const overview = await this.nexusParser.getOverview();
      return {
        contents: [
          {
            uri: 'pubky://api/nexus/overview',
            mimeType: 'text/markdown',
            text: overview,
          },
        ],
      };
    } else if (parts[0] === 'schemas') {
      const schemas = await this.nexusParser.getSchemas();
      return {
        contents: [
          {
            uri: 'pubky://api/nexus/schemas',
            mimeType: 'text/markdown',
            text: schemas,
          },
        ],
      };
    } else if (parts[0] === 'endpoints' && parts[1]) {
      const category = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
      const endpoints = await this.nexusParser.getEndpointsByCategory(category);
      return {
        contents: [
          {
            uri: `pubky://api/nexus/endpoints/${parts[1]}`,
            mimeType: 'text/markdown',
            text: endpoints,
          },
        ],
      };
    } else {
      throw new Error(`Unknown Nexus API resource: ${parts.join('/')}`);
    }
  }

  private async getSpecsResource(
    parts: string[]
  ): Promise<{ contents: { uri: string; mimeType: string; text: string }[] }> {
    if (parts[0] === 'overview') {
      const overview = await this.specsParser.getOverview();
      return {
        contents: [
          {
            uri: 'pubky://specs/overview',
            mimeType: 'text/markdown',
            text: overview,
          },
        ],
      };
    } else if (parts[0] === 'examples') {
      const examples = await this.specsParser.getJavaScriptExamples();
      return {
        contents: [
          {
            uri: 'pubky://specs/examples',
            mimeType: 'text/markdown',
            text: examples,
          },
        ],
      };
    } else if (parts[0] === 'models' && parts[1]) {
      const modelInfo = await this.specsParser.getModelInfo(parts[1]);
      return {
        contents: [
          {
            uri: `pubky://specs/models/${parts[1]}`,
            mimeType: 'text/markdown',
            text: modelInfo,
          },
        ],
      };
    } else {
      throw new Error(`Unknown specs resource: ${parts.join('/')}`);
    }
  }

  private async generateHomeserverApiDocs(): Promise<string> {
    return `## HTTP API Endpoints

### Authentication

#### POST /signup
Sign up a new user on the homeserver.
- Requires: AuthToken in request body
- Optional: Signup token (if homeserver requires it)
- Returns: Session ID cookie

#### POST /session
Sign in an existing user.
- Requires: AuthToken in request body
- Returns: Session ID cookie

#### DELETE /session
Sign out (delete current session).
- Requires: Valid session cookie

#### GET /session
Get current session information.
- Requires: Valid session cookie
- Returns: Session details including capabilities

### Storage Operations

#### GET /{*path}
Read a file from storage.
- Public files: No authentication required
- Private files: Requires valid session with read capability

#### HEAD /{*path}
Get file metadata without downloading content.
- Same authentication rules as GET

#### PUT /{*path}
Write/update a file in storage.
- Requires: Valid session with write capability
- Body: File content (up to 100MB)

#### DELETE /{*path}
Delete a file from storage.
- Requires: Valid session with write capability

### Events

#### GET /events/
Get a feed of storage events (Server-Sent Events).
- Parameters: ?limit=N&cursor=TIMESTAMP
- Returns: Stream of file change events

### Admin Endpoints

These endpoints require the X-Admin-Password header.

#### GET /generate_signup_token
Generate a new signup token (if signup mode requires tokens).

#### POST /disable_users
Disable user accounts.

#### GET /info
Get homeserver information and statistics.
`;
  }
}
