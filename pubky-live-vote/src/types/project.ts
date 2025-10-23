export type ScoreComponent = 'complexity' | 'creativity' | 'presentation' | 'feedback';

export interface Project {
  id: string;
  name: string;
  description: string;
  tags: string[];
  scores: Record<ScoreComponent, number>;
  readiness: boolean;
  comment?: string;
  userTags: string[];
  teamMembers?: string[];
  aiScore?: number;
}

export interface BallotSessionEvent {
  type: 'ballot_submitted';
  timestamp: string;
  session?: {
    publicKey?: string | null;
    sessionId?: string | null;
  } | null;
  metadata?: Record<string, unknown>;
}

export interface BallotPayload {
  voterId: string;
  submittedAt: string;
  events?: BallotSessionEvent[];
  scores: Array<{
    projectId: string;
    scores: Record<ScoreComponent, number>;
    readiness: boolean;
    comment?: string;
    tags: string[];
  }>;
  popularRanking: string[];
}

export type LeaderboardComponent =
  | 'complexity'
  | 'creativity'
  | 'readiness'
  | 'presentation'
  | 'feedback'
  | 'popular'
  | 'ai';

export type LeaderboardComponents = Record<LeaderboardComponent, number>;

export interface LeaderboardEntry {
  projectId: string;
  projectName: string;
  total: number;
  components: LeaderboardComponents;
}

export interface LeaderboardSummaryResponse {
  generatedAt: string;
  totalVoters: number;
  entries: Array<{
    projectId: string;
    components: LeaderboardComponents;
    total: number;
  }>;
}

export interface LeaderboardState {
  entries: LeaderboardEntry[];
  totalVoters: number;
  generatedAt: string;
  source: 'remote-summary' | 'ballots' | 'local';
}
