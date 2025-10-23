import type {
  BallotPayload,
  LeaderboardComponent,
  LeaderboardComponents,
  LeaderboardEntry,
  LeaderboardState,
  LeaderboardSummaryResponse,
  Project,
  ScoreComponent
} from '../types/project';
import { fetchBallotSnapshot, fetchLeaderboardSummary } from './homeserverApi';

const WEIGHTS: Record<LeaderboardComponent, number> = {
  complexity: 0.15,
  creativity: 0.15,
  readiness: 0.1,
  presentation: 0.15,
  feedback: 0.15,
  popular: 0.15,
  ai: 0.15
};

export const loadLeaderboard = async (projects: Project[]): Promise<LeaderboardState> => {
  const summary = await fetchLeaderboardSummary();
  if (summary) {
    return normalizeSummary(summary, projects);
  }

  const ballots = await fetchBallotSnapshot();
  if (ballots.length) {
    return computeFromBallots(ballots, projects);
  }

  return computeFromLocalProjects(projects);
};

const normalizeSummary = (
  summary: LeaderboardSummaryResponse,
  projects: Project[]
): LeaderboardState => {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const coveredIds = new Set(summary.entries.map((entry) => entry.projectId));

  const entries: LeaderboardEntry[] = [
    ...summary.entries.map((entry) => ({
      projectId: entry.projectId,
      projectName: projectById.get(entry.projectId)?.name ?? entry.projectId,
      total: entry.total,
      components: entry.components
    }))
  ];

  projects.forEach((project) => {
    if (coveredIds.has(project.id)) return;
    entries.push({
      projectId: project.id,
      projectName: project.name,
      total: 0,
      components: createEmptyComponents(project.aiScore ?? 0)
    });
  });

  const sorted = sortEntries(entries);

  return {
    entries: sorted,
    totalVoters: summary.totalVoters,
    generatedAt: summary.generatedAt,
    source: 'remote-summary'
  };
};

const computeFromBallots = (ballots: BallotPayload[], projects: Project[]): LeaderboardState => {
  const deduped = dedupeBallots(ballots);
  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const aggregates = new Map(
    projects.map((project) => [project.id, createAggregate(project.aiScore ?? 0)])
  );

  const totalProjects = projects.length || 1;

  deduped.forEach((ballot) => {
    ballot.scores.forEach((score) => {
      const aggregate = aggregates.get(score.projectId);
      if (!aggregate) return;
      (['complexity', 'creativity', 'presentation', 'feedback'] as ScoreComponent[]).forEach(
        (component) => {
          const value = score.scores[component] ?? 0;
          aggregate[component].sum += value;
          aggregate[component].count += 1;
        }
      );
      aggregate.readiness.sum += score.readiness ? 1 : 0;
      aggregate.readiness.count += 1;
    });

    ballot.popularRanking.forEach((projectId, index) => {
      const aggregate = aggregates.get(projectId);
      if (!aggregate) return;
      const weight = Math.max(totalProjects - index, 0);
      aggregate.popularPoints += weight;
    });
  });

  const maxPopularPoints = deduped.length * totalProjects;

  const entries: LeaderboardEntry[] = [];
  aggregates.forEach((aggregate, projectId) => {
    const project = projectMap.get(projectId);
    if (!project) return;
    const components = computeNormalizedComponents(aggregate, maxPopularPoints);
    entries.push({
      projectId,
      projectName: project.name,
      total: computeTotal(components),
      components
    });
  });

  const sorted = sortEntries(entries);

  return {
    entries: sorted,
    totalVoters: deduped.length,
    generatedAt: new Date().toISOString(),
    source: 'ballots'
  };
};

const computeFromLocalProjects = (projects: Project[]): LeaderboardState => {
  const entries: LeaderboardEntry[] = projects.map((project) => {
    const components: LeaderboardComponents = {
      complexity: project.scores.complexity * 10,
      creativity: project.scores.creativity * 10,
      readiness: project.readiness ? 100 : 0,
      presentation: project.scores.presentation * 10,
      feedback: project.scores.feedback * 10,
      popular: 0,
      ai: project.aiScore ?? 0
    };

    return {
      projectId: project.id,
      projectName: project.name,
      total: computeTotal(components),
      components
    };
  });

  const sorted = sortEntries(entries);

  return {
    entries: sorted,
    totalVoters: Math.max(1, deduceLocalVoterCount()),
    generatedAt: new Date().toISOString(),
    source: 'local'
  };
};

const dedupeBallots = (ballots: BallotPayload[]) => {
  const byVoter = new Map<string, BallotPayload>();
  ballots.forEach((ballot) => {
    const existing = byVoter.get(ballot.voterId);
    if (!existing) {
      byVoter.set(ballot.voterId, ballot);
      return;
    }
    const existingTime = Date.parse(existing.submittedAt);
    const currentTime = Date.parse(ballot.submittedAt);
    if (!Number.isNaN(currentTime) && currentTime >= existingTime) {
      byVoter.set(ballot.voterId, ballot);
    }
  });
  return Array.from(byVoter.values());
};

type Aggregate = ReturnType<typeof createAggregate>;

const createAggregate = (aiScore: number) => ({
  complexity: { sum: 0, count: 0 },
  creativity: { sum: 0, count: 0 },
  presentation: { sum: 0, count: 0 },
  feedback: { sum: 0, count: 0 },
  readiness: { sum: 0, count: 0 },
  popularPoints: 0,
  aiScore
});

const createEmptyComponents = (aiScore: number): LeaderboardComponents => ({
  complexity: 0,
  creativity: 0,
  readiness: 0,
  presentation: 0,
  feedback: 0,
  popular: 0,
  ai: aiScore
});

const computeNormalizedComponents = (aggregate: Aggregate, maxPopularPoints: number) => {
  const complexity = normalizeSlider(aggregate.complexity.sum, aggregate.complexity.count);
  const creativity = normalizeSlider(aggregate.creativity.sum, aggregate.creativity.count);
  const presentation = normalizeSlider(aggregate.presentation.sum, aggregate.presentation.count);
  const feedback = normalizeSlider(aggregate.feedback.sum, aggregate.feedback.count);
  const readiness = normalizeBoolean(aggregate.readiness.sum, aggregate.readiness.count);
  const popular = maxPopularPoints > 0 ? (aggregate.popularPoints / maxPopularPoints) * 100 : 0;

  return {
    complexity,
    creativity,
    readiness,
    presentation,
    feedback,
    popular,
    ai: aggregate.aiScore
  } satisfies LeaderboardComponents;
};

const deduceLocalVoterCount = () => {
  if (typeof window === 'undefined' || !window.localStorage) return 1;
  const queued = window.localStorage.getItem('pubky-live-vote:queue');
  if (!queued) return 1;
  try {
    const parsed = JSON.parse(queued) as Array<{ id: string }>;
    return Math.max(1, parsed.length + 1);
  } catch (error) {
    console.debug('Unable to parse local queue for voter count', error);
    return 1;
  }
};

const normalizeSlider = (sum: number, count: number) => {
  if (!count) return 0;
  const average = sum / count;
  return average * 10;
};

const normalizeBoolean = (sum: number, count: number) => {
  if (!count) return 0;
  return (sum / count) * 100;
};

const computeTotal = (components: LeaderboardComponents) =>
  (components.complexity ?? 0) * WEIGHTS.complexity +
  (components.creativity ?? 0) * WEIGHTS.creativity +
  (components.readiness ?? 0) * WEIGHTS.readiness +
  (components.presentation ?? 0) * WEIGHTS.presentation +
  (components.feedback ?? 0) * WEIGHTS.feedback +
  (components.popular ?? 0) * WEIGHTS.popular +
  (components.ai ?? 0) * WEIGHTS.ai;

const sortEntries = (entries: LeaderboardEntry[]) =>
  [...entries].sort((a, b) => b.total - a.total);

