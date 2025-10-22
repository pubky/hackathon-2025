import type { Project } from '../types/project';

export const demoProjects: Project[] = [
  {
    id: 'quantum-gardeners',
    name: 'Quantum Gardeners',
    description: 'AI-assisted plant care with on-chain seed provenance, synced to Pubky storage.',
    tags: ['ai', 'iot', 'sustainability'],
    scores: {
      complexity: 7,
      creativity: 8,
      presentation: 7,
      feedback: 6
    },
    readiness: true,
    userTags: ['ai', 'iot'],
    aiScore: 78
  },
  {
    id: 'cross-border-wallets',
    name: 'Cross-border Wallets',
    description: 'Remittance wallet built on Pubky identity, enabling programmable allowances.',
    tags: ['payments', 'defi'],
    scores: {
      complexity: 6,
      creativity: 7,
      presentation: 8,
      feedback: 7
    },
    readiness: false,
    userTags: ['defi'],
    aiScore: 74
  },
  {
    id: 'open-source-intel',
    name: 'Open Source Intel',
    description: 'Collaborative investigations with verifiable audit trails and Pubky access controls.',
    tags: ['governance', 'tooling'],
    scores: {
      complexity: 8,
      creativity: 6,
      presentation: 6,
      feedback: 5
    },
    readiness: true,
    userTags: ['governance'],
    aiScore: 81
  },
  {
    id: 'citizen-science',
    name: 'Citizen Science Cloud',
    description: 'Crowd-powered research notebooks with Pubky-backed notarisation.',
    tags: ['education', 'science'],
    scores: {
      complexity: 5,
      creativity: 7,
      presentation: 8,
      feedback: 9
    },
    readiness: true,
    userTags: ['education'],
    aiScore: 77
  },
  {
    id: 'lightning-polls',
    name: 'Lightning Polls',
    description: 'Pop-up voting flows with Pubky authentication for meetups and DAO gatherings.',
    tags: ['governance', 'community'],
    scores: {
      complexity: 6,
      creativity: 8,
      presentation: 7,
      feedback: 8
    },
    readiness: false,
    userTags: ['community'],
    aiScore: 73
  }
];
