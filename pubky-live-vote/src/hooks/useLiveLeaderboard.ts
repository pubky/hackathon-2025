import { useCallback, useEffect, useRef, useState } from 'react';
import type { LeaderboardState, Project } from '../types/project';
import { loadLeaderboard } from '../services/leaderboard';

interface LeaderboardHookState extends LeaderboardState {
  isLoading: boolean;
  error: Error | null;
}

const emptyState: LeaderboardHookState = {
  entries: [],
  totalVoters: 0,
  generatedAt: new Date(0).toISOString(),
  source: 'local',
  isLoading: true,
  error: null
};

export const useLiveLeaderboard = (projects: Project[]) => {
  const [state, setState] = useState<LeaderboardHookState>(emptyState);
  const projectsRef = useRef(projects);
  const isMountedRef = useRef(true);

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  const refresh = useCallback(async () => {
    try {
      const snapshot = await loadLeaderboard(projectsRef.current);
      if (!isMountedRef.current) return;
      setState({ ...snapshot, isLoading: false, error: null });
    } catch (error) {
      if (!isMountedRef.current) return;
      const resolvedError =
        error instanceof Error ? error : new Error('Failed to load leaderboard summary');
      setState((prev) => ({ ...prev, isLoading: false, error: resolvedError }));
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void refresh();
    if (typeof window === 'undefined') {
      return () => {
        isMountedRef.current = false;
      };
    }
    const interval = window.setInterval(() => {
      void refresh();
    }, 10000);
    return () => {
      isMountedRef.current = false;
      window.clearInterval(interval);
    };
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [projects, refresh]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleSubmission = () => {
      void refresh();
    };
    window.addEventListener('pubky:ballot-submitted', handleSubmission);
    return () => {
      window.removeEventListener('pubky:ballot-submitted', handleSubmission);
    };
  }, [refresh]);

  return { ...state, refresh };
};
