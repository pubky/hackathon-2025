/**
 * Nexus API Parser - Utilities for parsing and exposing nexus-webapi.json OpenAPI specification
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface NexusEndpoint {
  path: string;
  method: string;
  operationId: string;
  description: string;
  parameters: any[];
  requestBody?: any;
  responses: any;
  tags: string[];
}

export interface NexusSchema {
  name: string;
  schema: any;
  description?: string;
}

export class NexusApiParser {
  private spec: any = null;
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  async loadSpec(): Promise<void> {
    if (this.spec) return;

    const specPath = path.join(this.workspaceRoot, 'nexus-webapi.json');
    const content = await fs.readFile(specPath, 'utf-8');
    this.spec = JSON.parse(content);
  }

  async getOverview(): Promise<string> {
    await this.loadSpec();

    let output = `# Nexus Web API\n\n`;
    output += `**Version**: ${this.spec.info.version}\n`;
    output += `**Title**: ${this.spec.info.title}\n\n`;
    output += `${this.spec.info.description}\n\n`;
    output += `**License**: ${this.spec.info.license.name}\n\n`;

    output += `## API Categories\n\n`;
    const categories = this.getEndpointCategories();
    for (const [category, count] of Object.entries(categories)) {
      output += `- **${category}**: ${count} endpoints\n`;
    }

    return output;
  }

  async getEndpointsByCategory(category: string): Promise<string> {
    await this.loadSpec();

    const endpoints = this.extractEndpoints().filter(ep =>
      ep.tags.some(tag => tag.toLowerCase() === category.toLowerCase())
    );

    if (endpoints.length === 0) {
      return `No endpoints found for category: ${category}`;
    }

    let output = `# ${category} Endpoints\n\n`;

    for (const endpoint of endpoints) {
      output += `## ${endpoint.method.toUpperCase()} ${endpoint.path}\n\n`;
      output += `**Operation**: \`${endpoint.operationId}\`\n\n`;
      output += `${endpoint.description}\n\n`;

      if (endpoint.parameters.length > 0) {
        output += `### Parameters\n\n`;
        for (const param of endpoint.parameters) {
          const required = param.required ? '(required)' : '(optional)';
          output += `- **${param.name}** ${required}: ${param.description || 'No description'}\n`;
          if (param.schema) {
            output += `  - Type: \`${param.schema.type || 'any'}\`\n`;
            if (param.schema.enum) {
              output += `  - Values: ${param.schema.enum.map((v: any) => `\`${v}\``).join(', ')}\n`;
            }
          }
        }
        output += `\n`;
      }

      if (endpoint.requestBody) {
        output += `### Request Body\n\n`;
        const content = endpoint.requestBody.content?.['application/json'];
        if (content?.schema?.$ref) {
          const schemaName = content.schema.$ref.split('/').pop();
          output += `Schema: \`${schemaName}\`\n\n`;
        }
      }

      output += `### Responses\n\n`;
      for (const [code, response] of Object.entries(endpoint.responses)) {
        output += `- **${code}**: ${(response as any).description}\n`;
      }
      output += `\n---\n\n`;
    }

    return output;
  }

  async getSchemas(): Promise<string> {
    await this.loadSpec();

    let output = `# Nexus API Data Schemas\n\n`;

    const schemas = this.spec.components?.schemas || {};
    const schemaNames = Object.keys(schemas).sort();

    output += `## Available Schemas\n\n`;
    for (const name of schemaNames) {
      const schema = schemas[name];
      const desc = schema.description || 'No description';
      output += `- **${name}**: ${desc}\n`;
    }

    output += `\n## Schema Details\n\n`;

    for (const name of schemaNames) {
      const schema = schemas[name];
      output += `### ${name}\n\n`;

      if (schema.description) {
        output += `${schema.description}\n\n`;
      }

      if (schema.type === 'object' && schema.properties) {
        output += `**Properties**:\n\n`;
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          const prop: any = propSchema;
          const required = schema.required?.includes(propName) ? ' (required)' : '';
          const type = prop.type || (prop.$ref ? prop.$ref.split('/').pop() : 'unknown');
          output += `- \`${propName}\`${required}: ${type}`;
          if (prop.description) {
            output += ` - ${prop.description}`;
          }
          output += `\n`;
        }
        output += `\n`;
      } else if (schema.type === 'array') {
        output += `**Type**: Array\n\n`;
        if (schema.items?.$ref) {
          output += `**Items**: \`${schema.items.$ref.split('/').pop()}\`\n\n`;
        }
      } else if (schema.enum) {
        output += `**Type**: Enum\n\n`;
        output += `**Values**: ${schema.enum.map((v: any) => `\`${v}\``).join(', ')}\n\n`;
      } else if (schema.oneOf) {
        output += `**Type**: One of multiple types\n\n`;
      }

      output += `---\n\n`;
    }

    return output;
  }

  async generateEndpointExample(operationId: string): Promise<string> {
    await this.loadSpec();

    const endpoints = this.extractEndpoints();
    const endpoint = endpoints.find(ep => ep.operationId === operationId);

    if (!endpoint) {
      return `Endpoint with operation ID "${operationId}" not found`;
    }

    let output = `# ${endpoint.operationId} Example\n\n`;
    output += `## Endpoint\n\n`;
    output += `\`${endpoint.method.toUpperCase()} ${endpoint.path}\`\n\n`;
    output += `${endpoint.description}\n\n`;

    // JavaScript example
    output += `## JavaScript Example\n\n\`\`\`javascript\n`;
    output += `const NEXUS_API_URL = 'https://nexus.example.com';\n\n`;
    output += `async function ${this.toCamelCase(operationId)}(`;

    const pathParams = endpoint.parameters.filter((p: any) => p.in === 'path');
    const queryParams = endpoint.parameters.filter((p: any) => p.in === 'query');

    const paramNames = pathParams.map((p: any) => p.name);
    if (queryParams.length > 0) {
      paramNames.push('options = {}');
    }

    output += paramNames.join(', ');
    output += `) {\n`;

    // Build URL
    let urlPath = endpoint.path;
    for (const param of pathParams) {
      urlPath = urlPath.replace(`{${param.name}}`, `\${${param.name}}`);
    }
    output += `  let url = \`\${NEXUS_API_URL}${urlPath}\`;\n\n`;

    if (queryParams.length > 0) {
      output += `  // Add query parameters\n`;
      output += `  const params = new URLSearchParams();\n`;
      for (const param of queryParams) {
        output += `  if (options.${param.name} !== undefined) params.append('${param.name}', options.${param.name});\n`;
      }
      output += `  if (params.toString()) url += '?' + params.toString();\n\n`;
    }

    output += `  const response = await fetch(url`;
    if (endpoint.requestBody) {
      output += `, {\n    method: '${endpoint.method.toUpperCase()}',\n`;
      output += `    headers: { 'Content-Type': 'application/json' },\n`;
      output += `    body: JSON.stringify(data)\n  }`;
    }
    output += `);\n\n`;
    output += `  if (!response.ok) throw new Error(\`HTTP error! status: \${response.status}\`);\n`;
    output += `  return await response.json();\n`;
    output += `}\n\n`;

    // Usage example
    output += `// Usage\n`;
    if (pathParams.length > 0) {
      const exampleParams = pathParams.map((p: any) => `'example_${p.name}'`).join(', ');
      output += `const result = await ${this.toCamelCase(operationId)}(${exampleParams});\n`;
    } else {
      output += `const result = await ${this.toCamelCase(operationId)}();\n`;
    }
    output += `console.log(result);\n`;
    output += `\`\`\`\n`;

    return output;
  }

  private extractEndpoints(): NexusEndpoint[] {
    const endpoints: NexusEndpoint[] = [];

    for (const [path, pathItem] of Object.entries(this.spec.paths || {})) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
          const op = operation as any;
          endpoints.push({
            path,
            method,
            operationId: op.operationId,
            description: op.description || op.summary || '',
            parameters: op.parameters || [],
            requestBody: op.requestBody,
            responses: op.responses || {},
            tags: op.tags || [],
          });
        }
      }
    }

    return endpoints;
  }

  private getEndpointCategories(): Record<string, number> {
    const endpoints = this.extractEndpoints();
    const categories: Record<string, number> = {};

    for (const endpoint of endpoints) {
      for (const tag of endpoint.tags) {
        categories[tag] = (categories[tag] || 0) + 1;
      }
    }

    return categories;
  }

  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  async searchEndpoints(query: string): Promise<string> {
    await this.loadSpec();

    const queryLower = query.toLowerCase();
    const endpoints = this.extractEndpoints();
    const matches = endpoints.filter(
      ep =>
        ep.operationId.toLowerCase().includes(queryLower) ||
        ep.description.toLowerCase().includes(queryLower) ||
        ep.path.toLowerCase().includes(queryLower)
    );

    if (matches.length === 0) {
      return `No endpoints found matching: ${query}`;
    }

    let output = `# Search Results for "${query}"\n\n`;
    output += `Found ${matches.length} matching endpoint(s):\n\n`;

    for (const endpoint of matches) {
      output += `## ${endpoint.method.toUpperCase()} ${endpoint.path}\n`;
      output += `- **Operation**: ${endpoint.operationId}\n`;
      output += `- **Description**: ${endpoint.description}\n`;
      output += `- **Tags**: ${endpoint.tags.join(', ')}\n\n`;
    }

    return output;
  }
}

