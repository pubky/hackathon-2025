/**
 * Common types for the Pubky MCP Server
 */

// Common response types
export type ToolResponse = { content: Array<{ type: string; text: string }> };
export type PromptResponse = { messages: Array<{ role: string; content: { type: string; text: string } }> };
export type ResourceResponse = { contents: { uri: string; mimeType: string; text: string }[] };

export interface PubkyCorePaths {
  root: string;
  docs: string;
  examples: string;
  examplesRust: string;
  examplesJs: string;
}

export interface PkarrPaths {
  root: string;
  design: string;
  examples: string;
  bindingsJs: string;
  relay: string;
}

export interface PkdnsPaths {
  root: string;
  docs: string;
  cli: string;
  serverConfig: string;
}

export interface NexusPaths {
  root: string;
  docs: string;
  examples: string;
  componentReadmes: {
    common: string;
    watcher: string;
    webapi: string;
  };
}

export interface TestnetInfo {
  isRunning: boolean;
  homeserverPublicKey: string;
  ports: {
    dht: number;
    pkarrRelay: number;
    httpRelay: number;
    homeserver: number;
    adminServer: number;
  };
  urls: {
    homeserver: string;
    admin: string;
    httpRelay: string;
  };
}

export interface ProjectAnalysis {
  type: 'rust' | 'javascript' | 'typescript' | 'unknown';
  hasPackageJson: boolean;
  hasCargoToml: boolean;
  hasPubkyDependency: boolean;
  framework?: string;
  dependencies: string[];
  devDependencies: string[];
}

export interface EnvironmentInfo {
  node?: {
    version: string;
    path: string;
  };
  npm?: {
    version: string;
    path: string;
  };
  cargo?: {
    version: string;
    path: string;
  };
  rust?: {
    version: string;
    path: string;
  };
  pubkyTestnet?: {
    installed: boolean;
    path?: string;
  };
  os: string;
  arch: string;
}

export interface CodeTemplate {
  name: string;
  description: string;
  language: 'rust' | 'javascript' | 'typescript';
  code: string;
  dependencies?: string[];
}

export interface PkarrRelayInfo {
  running: boolean;
  port?: number;
  cacheLocation?: string;
  url?: string;
  testnet?: boolean;
}

export interface PkarrRelayConfig {
  port?: number;
  cachePath?: string;
  cacheSize?: number;
  minimumTtl?: number;
  maximumTtl?: number;
  testnet?: boolean;
  rateLimiter?: {
    behindProxy: boolean;
    burstSize: number;
    perSecond: number;
  };
}
