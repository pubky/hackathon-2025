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
