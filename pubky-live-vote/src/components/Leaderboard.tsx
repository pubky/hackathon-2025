import { useMemo } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useLiveLeaderboard } from '../hooks/useLiveLeaderboard';
import type { LeaderboardEntry, Project } from '../types/project';
import './Leaderboard.css';

const SOURCE_LABEL: Record<'remote-summary' | 'ballots' | 'local', string> = {
  'remote-summary': 'Pubky homeserver summary',
  ballots: 'Aggregated ballots',
  local: 'Local preview'
};

const formatUpdatedAt = (iso: string) => {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return 'unknown';
  const diffMs = Date.now() - parsed;
  if (diffMs < 30_000) return 'just now';
  if (diffMs < 3_600_000) {
    const minutes = Math.round(diffMs / 60_000);
    return `${minutes} min ago`;
  }
  const hours = Math.round(diffMs / 3_600_000);
  if (hours < 48) {
    return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  }
  return new Date(parsed).toLocaleString();
};

const formatVoterCount = (count: number) =>
  `${count} voter${count === 1 ? '' : 's'}`;

const numberFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});

const integerFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

export const Leaderboard = () => {
  const { projects, popularRanking } = useProjects();
  const { entries, totalVoters, generatedAt, source, isLoading, error } = useLiveLeaderboard(
    projects,
    popularRanking
  );

  const rows = useMemo(() => (entries.length ? entries : placeholderRows(projects)), [entries, projects]);

  return (
    <div className="leaderboard">
      <header>
        <h2>Live Leaderboard</h2>
        <div className="leaderboard__meta">
          <span>{isLoading ? 'Loading scores…' : `${formatVoterCount(totalVoters)} · ${formatUpdatedAt(generatedAt)}`}</span>
          <span className="leaderboard__source">Source: {SOURCE_LABEL[source]}</span>
        </div>
        {error && <p className="leaderboard__error">{error.message}</p>}
      </header>
      <div className="leaderboard__table" role="table" aria-label="Leaderboard">
        <div className="leaderboard__row leaderboard__row--header" role="row">
          <span role="columnheader">Rank</span>
          <span role="columnheader">Project</span>
          <span role="columnheader">Total</span>
          <span role="columnheader">Complexity</span>
          <span role="columnheader">Creativity</span>
          <span role="columnheader">Readiness</span>
          <span role="columnheader">Presentation</span>
          <span role="columnheader">Feedback</span>
          <span role="columnheader">Popular</span>
          <span role="columnheader">AI</span>
        </div>
        {rows.map((row, index) => (
          <div key={row.projectId} className="leaderboard__row" role="row">
            <span role="cell">{index + 1}</span>
            <span role="cell">{row.projectName}</span>
            <span role="cell" className="strong">
              {numberFormatter.format(row.total)}
            </span>
            <span role="cell">{integerFormatter.format(row.components.complexity)}</span>
            <span role="cell">{integerFormatter.format(row.components.creativity)}</span>
            <span role="cell">{integerFormatter.format(row.components.readiness)}</span>
            <span role="cell">{integerFormatter.format(row.components.presentation)}</span>
            <span role="cell">{integerFormatter.format(row.components.feedback)}</span>
            <span role="cell">{integerFormatter.format(row.components.popular)}</span>
            <span role="cell">{integerFormatter.format(row.components.ai)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const placeholderRows = (projects: Project[]): LeaderboardEntry[] =>
  projects.map((project) => ({
    projectId: project.id,
    projectName: project.name,
    total: 0,
    components: {
      complexity: 0,
      creativity: 0,
      readiness: 0,
      presentation: 0,
      feedback: 0,
      popular: 0,
      ai: project.aiScore ?? 0
    }
  }));
