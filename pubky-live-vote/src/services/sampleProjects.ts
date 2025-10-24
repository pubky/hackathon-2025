import type { Project } from '../types/project';

type ProjectSeed = Omit<Project, 'scores' | 'readiness' | 'userTags' | 'comment'>;

const seeds: ProjectSeed[] = [
  {
    id: 'pubky-mcp-server',
    name: 'Pubky MCP server',
    description:
      'An MCP server can let developers talk to Pubky in plain English instead of wrestling with testnet setup, keypair management, and API docs.',
    tags: ['developer-tools', 'automation', 'sdk'],
    teamMembers: ['Vlada'],
    aiScore: 86
  },
  {
    id: 'pubky-homeserver-cli',
    name: 'CLI for pubky homeserver',
    description: 'One tool for automation of flow with commands instead of code',
    tags: ['cli', 'infrastructure', 'automation'],
    teamMembers: ['Vladimir', 'Piotr'],
    aiScore: 79
  },
  {
    id: 'pubky-tag-extension',
    name: 'Homegate',
    description: 'Create a homeserver UI that shows different types of plans for users to sign up.',
    tags: ['browser', 'productivity', 'tagging'],
    teamMembers: ['Miguel', 'Oier', 'Severin'],
    aiScore: 75
  },
  {
    id: 'booksy',
    name: 'Booksy',
    description: 'A bookmark sharing browser extension',
    tags: ['community', 'browser', 'sharing'],
    teamMembers: ['Jams', 'Tomos'],
    aiScore: 72
  },
  {
    id: 'pubky-cookbook',
    name: 'Cookbook',
    description: 'To bmake it easy to onboard developers',
    tags: ['education', 'docs', 'developer-tools'],
    teamMembers: ['Aldert'],
    aiScore: 83
  },
  {
    id: 'decentralized-wiki',
    name: 'Decentralized Wiki',
    description: 'Pubky-based decentralized wiki',
    tags: ['knowledge', 'governance', 'pubky'],
    teamMembers: ['Carlos', 'Pav', 'Ovi'],
    aiScore: 78
  },
  {
    id: 'monky',
    name: 'ConsentKy',
    description: 'Social contracts based on keys',
    tags: ['social', 'identity', 'governance'],
    teamMembers: ['Jacobo', 'Oliver'],
    aiScore: 82
  },
  {
    id: 'pubky-live-vote',
    name: 'Pubky Live Vote',
    description: 'Allow participants of the hackathon to vote for each projects',
    tags: ['voting', 'event', 'pubky'],
    teamMembers: ['JC'],
    aiScore: 88
  },
  {
    id: 'geostories',
    name: 'GeoStories',
    description:
      'A way to view and add markers to a map for sharing stories and photos to particular geographic locations using pubky-sdk',
    tags: ['mapping', 'storytelling', 'pubky'],
    teamMembers: ['Corey'],
    aiScore: 84
  },
  {
    id: 'publar',
    name: 'Publar',
    description: 'A developer tool similar to Polar (for Lightning), but for the Pubky ecosystem',
    tags: ['developer-tools', 'pubky', 'payments'],
    teamMembers: ['Kevin'],
    aiScore: 81
  },
  {
    id: 'pubkylab',
    name: 'PubkyLab',
    description: 'An interactive web-based playground where developers can instantly test SDK operations',
    tags: ['developer-tools', 'playground', 'sdk'],
    teamMembers: ['Joao'],
    aiScore: 77
  },
  {
    id: 'p2pjobs',
    name: 'P2PJobs',
    description: 'Decentralized Job Board',
    tags: ['jobs', 'marketplace', 'p2p'],
    teamMembers: ['@P2PJobsTeam'],
    aiScore: 70
  }
];

const createEmptyScores = (): Project['scores'] => ({
  complexity: 0,
  creativity: 0,
  presentation: 0,
  feedback: 0
});

export const demoProjects: Project[] = seeds.map((project) => ({
  ...project,
  scores: createEmptyScores(),
  readiness: false,
  comment: '',
  userTags: []
}));
