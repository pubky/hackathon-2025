/**
 * Common types for the Pubky MCP Server
 */

export interface PubkyCorePaths {
  root: string;
  docs: string;
  examples: string;
  examplesRust: string;
  examplesJs: string;
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
