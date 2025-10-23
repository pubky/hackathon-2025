import type { Project } from '../types/project';

export const demoProjects: Project[] = [
  {
    id: 'pubky-mcp-server',
    name: 'Pubky MCP server',
    description:
      'An MCP server can let developers talk to Pubky in plain English instead of wrestling with testnet setup, keypair management, and API docs.',
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
    name: 'CLI for pubky homeserver',
    description: 'One tool for automation of flow with commands instead of code',
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
    name: 'Browser extension to tag the web',
    description: 'No easy way to compartmentalize your information sources and content',
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
    description: 'A bookmark sharing browser extension',
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
    description: 'To bmake it easy to onboard developers',
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
    description: 'Pubky-based decentralized wiki',
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
    description: 'Social contracts based on keys',
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
    description: 'Allow participants of the hackathon to vote for each projects',
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
      'A way to view and add markers to a map for sharing stories and photos to particular geographic locations using pubky-sdk',
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
    description: 'UDP relay that attaches itself to a homeserver instance',
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
  }
];
