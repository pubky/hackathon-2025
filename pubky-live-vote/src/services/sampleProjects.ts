import type { Project } from '../types/project';

export const demoProjects: Project[] = [
  {
    id: 'pubky-mcp-server',
    name: 'Pubky MCP Server',
    description:
      'An MCP server that lets developers talk to Pubky in plain English instead of wrestling with testnet setup, keypair management, and API docs.',
    tags: ['developer-tools', 'automation', 'sdk'],
    scores: {
      complexity: 8,
      creativity: 7,
      presentation: 7,
      feedback: 8
    },
    readiness: true,
    userTags: ['sdk', 'automation'],
    aiScore: 86
  },
  {
    id: 'pubky-homeserver-cli',
    name: 'CLI for Pubky Homeserver',
    description: 'A single command-line tool that automates homeserver flows so teams can script deployments without writing code.',
    tags: ['cli', 'infrastructure', 'automation'],
    scores: {
      complexity: 7,
      creativity: 6,
      presentation: 7,
      feedback: 7
    },
    readiness: true,
    userTags: ['cli', 'ops'],
    aiScore: 79
  },
  {
    id: 'pubky-tag-extension',
    name: 'Browser Extension to Tag the Web',
    description: 'A browser companion that lets you tag articles and research with Pubky metadata so information sources stay compartmentalised.',
    tags: ['browser', 'productivity', 'tagging'],
    scores: {
      complexity: 6,
      creativity: 8,
      presentation: 7,
      feedback: 8
    },
    readiness: false,
    userTags: ['browser', 'research'],
    aiScore: 75
  },
  {
    id: 'booksy',
    name: 'Booksy',
    description: 'A bookmark sharing browser extension so teams can curate and exchange Pubky-powered reading lists.',
    tags: ['community', 'browser', 'sharing'],
    scores: {
      complexity: 5,
      creativity: 7,
      presentation: 8,
      feedback: 7
    },
    readiness: false,
    userTags: ['sharing'],
    aiScore: 72
  },
  {
    id: 'pubky-cookbook',
    name: 'Cookbook',
    description: 'A fast-start cookbook that makes it easy to onboard developers with runnable Pubky code samples.',
    tags: ['education', 'docs', 'developer-tools'],
    scores: {
      complexity: 6,
      creativity: 6,
      presentation: 8,
      feedback: 9
    },
    readiness: true,
    userTags: ['onboarding', 'docs'],
    aiScore: 83
  },
  {
    id: 'decentralized-wiki',
    name: 'Decentralized Wiki',
    description: 'A Pubky-based wiki where community knowledge is published without central control.',
    tags: ['knowledge', 'governance', 'pubky'],
    scores: {
      complexity: 7,
      creativity: 7,
      presentation: 6,
      feedback: 7
    },
    readiness: false,
    userTags: ['wiki'],
    aiScore: 78
  },
  {
    id: 'monky',
    name: 'MonKy',
    description: 'Social contracts anchored to Pubky keys so agreements stay verifiable across the network.',
    tags: ['social', 'identity', 'governance'],
    scores: {
      complexity: 8,
      creativity: 8,
      presentation: 6,
      feedback: 6
    },
    readiness: true,
    userTags: ['identity'],
    aiScore: 82
  },
  {
    id: 'pubky-live-vote',
    name: 'Pubky Live Vote',
    description: 'Let hackathon participants score every project with real-time leaderboards and Pubky authentication.',
    tags: ['voting', 'event', 'pubky'],
    scores: {
      complexity: 6,
      creativity: 7,
      presentation: 9,
      feedback: 8
    },
    readiness: true,
    userTags: ['voting'],
    aiScore: 88
  },
  {
    id: 'geostories',
    name: 'GeoStories',
    description:
      'An interactive map for sharing stories and photos at specific locations using the pubky-sdk to anchor provenance.',
    tags: ['mapping', 'storytelling', 'pubky'],
    scores: {
      complexity: 7,
      creativity: 9,
      presentation: 7,
      feedback: 7
    },
    readiness: false,
    userTags: ['mapping'],
    aiScore: 84
  },
  {
    id: 'realm',
    name: 'Realm',
    description: 'A UDP relay that attaches itself to a homeserver instance to keep Pubky traffic resilient.',
    tags: ['networking', 'infrastructure', 'homeserver'],
    scores: {
      complexity: 8,
      creativity: 6,
      presentation: 6,
      feedback: 7
    },
    readiness: true,
    userTags: ['infra'],
    aiScore: 80
  },
  {
    id: 'pubkylab',
    name: 'PubkyLab',
    description:
      'A web-based playground where developers can instantly test Pubky SDK operations with real-time results.',
    tags: ['developer-tools', 'playground', 'sdk'],
    scores: {
      complexity: 7,
      creativity: 8,
      presentation: 8,
      feedback: 9
    },
    readiness: true,
    userTags: ['sdk', 'playground'],
    aiScore: 90
  }
];
