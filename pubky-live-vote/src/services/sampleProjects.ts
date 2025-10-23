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
    teamMembers: ['@Vlada'],
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
    teamMembers: ['@Vadimir', '@Piotr'],
    aiScore: 79
  },
  {
    id: 'pubky-tag-extension',
    name: 'Homegate',
    description: 'Create a homeserver UI that shows different types of plans for users to sign up.',
    tags: ['browser', 'productivity', 'tagging'],
    scores: {
      complexity: 6,
      creativity: 8,
      presentation: 7,
      feedback: 8
    },
    readiness: false,
    userTags: ['browser', 'research'],
    teamMembers: ['@Miguel', '@Oier', '@Severin'],
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
    teamMembers: ['@Jams', '@Tomos'],
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
    teamMembers: ['@Aldert'],
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
    teamMembers: ['@Carlos', '@Pav', '@Ovi'],
    aiScore: 78
  },
  {
    id: 'monky',
    name: 'ConsentKy',
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
    teamMembers: ['@Jacobo', '@Oliver'],
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
    teamMembers: ['@JC'],
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
    teamMembers: ['@Corey'],
    aiScore: 84
  },
  {
    id: 'publar',
    name: 'Publar',
    description: 'A developer tool similar to Polar (for Lightning), but for the Pubky ecosystem',
    tags: ['developer-tools', 'pubky', 'payments'],
    scores: {
      complexity: 7,
      creativity: 8,
      presentation: 7,
      feedback: 8
    },
    readiness: false,
    userTags: ['developer-tools'],
    teamMembers: ['@Kevin'],
    aiScore: 81
  },
  {
    id: 'pubkylab',
    name: 'PubkyLab',
    description: 'An interactive web-based playground where developers can instantly test SDK operations',
    tags: ['developer-tools', 'playground', 'sdk'],
    scores: {
      complexity: 6,
      creativity: 7,
      presentation: 8,
      feedback: 7
    },
    readiness: false,
    userTags: ['sdk', 'playground'],
    teamMembers: ['@Joao'],
    aiScore: 77
  },
  {
    id: 'p2pjobs',
    name: 'P2PJobs',
    description: 'Decentralized Job Board',
    tags: ['jobs', 'marketplace', 'p2p'],
    scores: {
      complexity: 6,
      creativity: 7,
      presentation: 6,
      feedback: 7
    },
    readiness: false,
    userTags: ['jobs'],
    teamMembers: ['@P2PJobsTeam'],
    aiScore: 70
  }
];
