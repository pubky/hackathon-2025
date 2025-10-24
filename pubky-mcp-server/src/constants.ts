/**
 * Constants for the Pubky MCP Server
 */

// Supported programming languages
export const LANGUAGES = {
  RUST: 'rust',
  JAVASCRIPT: 'javascript',
  TYPESCRIPT: 'typescript',
} as const;

export type Language = (typeof LANGUAGES)[keyof typeof LANGUAGES];

// Resource types
export const RESOURCE_TYPES = {
  DOCS: 'docs',
  EXAMPLES: 'examples',
  API: 'api',
  SPECS: 'specs',
} as const;

export type ResourceType = (typeof RESOURCE_TYPES)[keyof typeof RESOURCE_TYPES];

// Documentation sections
export const DOC_SECTIONS = {
  OVERVIEW: 'overview',
  CONCEPTS: 'concepts',
  AUTH: 'auth',
} as const;

export type DocSection = (typeof DOC_SECTIONS)[keyof typeof DOC_SECTIONS];

// Concept types
export const CONCEPT_TYPES = {
  HOMESERVER: 'homeserver',
  ROOTKEY: 'rootkey',
  AUTH: 'auth',
  CAPABILITIES: 'capabilities',
  STORAGE: 'storage',
} as const;

export type ConceptType = (typeof CONCEPT_TYPES)[keyof typeof CONCEPT_TYPES];

// API sections
export const API_SECTIONS = {
  HOMESERVER: 'homeserver',
  SDK: 'sdk',
  CAPABILITIES: 'capabilities',
  NEXUS: 'nexus',
} as const;

export type ApiSection = (typeof API_SECTIONS)[keyof typeof API_SECTIONS];

// Project types
export const PROJECT_TYPES = {
  RUST: 'rust',
  JAVASCRIPT: 'javascript',
  TYPESCRIPT: 'typescript',
  UNKNOWN: 'unknown',
} as const;

export type ProjectType = (typeof PROJECT_TYPES)[keyof typeof PROJECT_TYPES];

// Framework types
export const FRAMEWORKS = {
  REACT: 'react',
  VUE: 'vue',
  SVELTE: 'svelte',
} as const;

export type Framework = (typeof FRAMEWORKS)[keyof typeof FRAMEWORKS];

// Capability actions
export const CAPABILITY_ACTIONS = {
  READ: 'r',
  WRITE: 'w',
  READ_WRITE: 'rw',
} as const;

export type CapabilityAction = (typeof CAPABILITY_ACTIONS)[keyof typeof CAPABILITY_ACTIONS];

// File extensions for search
export const SEARCH_FILE_EXTENSIONS = ['.md', '.rs', '.js', '.mjs', '.ts'] as const;

// Ignored directories for search
export const IGNORED_DIRECTORIES = ['.', 'node_modules', 'target'] as const;

// Nexus API endpoint categories
export const NEXUS_ENDPOINT_CATEGORIES = {
  BOOTSTRAP: 'Bootstrap',
  POST: 'Post',
  USER: 'User',
  STREAM: 'Stream',
  SEARCH: 'Search',
  TAGS: 'Tags',
  TAG: 'Tag',
  FILE: 'File',
  INFO: 'Info',
} as const;

export type NexusEndpointCategory =
  (typeof NEXUS_ENDPOINT_CATEGORIES)[keyof typeof NEXUS_ENDPOINT_CATEGORIES];

// Pubky App Spec models
export const APP_SPEC_MODELS = {
  USER: 'user',
  POST: 'post',
  TAG: 'tag',
  BOOKMARK: 'bookmark',
  FOLLOW: 'follow',
  FILE: 'file',
  FEED: 'feed',
  MUTE: 'mute',
  LAST_READ: 'last_read',
  BLOB: 'blob',
} as const;

export type AppSpecModel = (typeof APP_SPEC_MODELS)[keyof typeof APP_SPEC_MODELS];

// Pkarr concepts
export const PKARR_CONCEPTS = {
  DISCOVERY: 'discovery',
  DHT: 'dht',
  RELAY: 'relay',
  SIGNED_PACKET: 'signed-packet',
  DNS_RECORDS: 'dns-records',
  REPUBLISHING: 'republishing',
  KEYPAIR: 'keypair',
  MAINLINE: 'mainline',
} as const;

export type PkarrConcept = (typeof PKARR_CONCEPTS)[keyof typeof PKARR_CONCEPTS];

// Pkarr example types
export const PKARR_EXAMPLE_TYPES = {
  PUBLISH: 'publish',
  RESOLVE: 'resolve',
  HTTP_SERVE: 'http-serve',
  HTTP_GET: 'http-get',
} as const;

export type PkarrExampleType = (typeof PKARR_EXAMPLE_TYPES)[keyof typeof PKARR_EXAMPLE_TYPES];

// Default Pkarr relay URLs
export const DEFAULT_PKARR_RELAYS = [
  'https://pkarr.pubky.app',
  'https://pkarr.pubky.org',
] as const;

// Pkarr relay default port
export const PKARR_RELAY_DEFAULT_PORT = 6881;

// Pkarr design document types
export const PKARR_DESIGN_DOCS = {
  BASE: 'base',
  RELAYS: 'relays',
  ENDPOINTS: 'endpoints',
  TLS: 'tls',
  RESOLVERS: 'resolvers',
} as const;

export type PkarrDesignDoc = (typeof PKARR_DESIGN_DOCS)[keyof typeof PKARR_DESIGN_DOCS];

// PKDNS constants (DNS resolver for Pkarr domains)
export const PKDNS_DEFAULT_PORT = 53;
export const PKDNS_DOH_PORT = 443;

export const PKDNS_COMMANDS = {
  PUBLISH: 'publish',
  RESOLVE: 'resolve',
  GENERATE: 'generate',
  PUBLICKEY: 'publickey',
} as const;

export type PkdnsCommand = (typeof PKDNS_COMMANDS)[keyof typeof PKDNS_COMMANDS];

export const PUBLIC_PKDNS_SERVERS = [
  'https://dns.pubky.app',
  'https://dns.pubky.org',
] as const;

// Pubky Nexus constants (social indexer implementation)
export const NEXUS_COMPONENTS = {
  WATCHER: 'watcher',
  SERVICE: 'service',
  NEXUSD: 'nexusd',
  COMMON: 'common',
} as const;

export type NexusComponent = (typeof NEXUS_COMPONENTS)[keyof typeof NEXUS_COMPONENTS];

export const NEXUS_DATABASES = {
  NEO4J: 'neo4j',
  REDIS: 'redis',
} as const;

export type NexusDatabase = (typeof NEXUS_DATABASES)[keyof typeof NEXUS_DATABASES];
