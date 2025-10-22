import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import type { BallotPayload, Project, ScoreComponent } from '../types/project';
import { enqueueBallot, flushQueue, registerQueueSender } from '../services/cacheQueue';
import { sendBallotToHomeserver } from '../services/homeserverApi';
import { demoProjects } from '../services/sampleProjects';

interface ProjectContextValue {
  projects: Project[];
  updateProjectScore: (projectId: string, component: ScoreComponent, value: number) => void;
  toggleReadiness: (projectId: string, ready: boolean) => void;
  updateComment: (projectId: string, comment: string) => void;
  updateTags: (projectId: string, tags: string[]) => void;
  submitBallot: () => Promise<void>;
  popularRanking: string[];
  setPopularRanking: (ranking: string[]) => void;
  userProjectId: string | null;
  setUserProjectId: (projectId: string | null) => void;
  hasPendingChanges: boolean;
  lastSubmittedAt: string | null;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

const STORAGE_KEY = 'pubky-live-vote:projects';
const RANKING_KEY = 'pubky-live-vote:popular';
const SUBMISSION_KEY = 'pubky-live-vote:last-submission';
const OWN_PROJECT_KEY = 'pubky-live-vote:own-project';

export const ProjectProvider = ({ children }: PropsWithChildren) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as Project[];
    }
    return demoProjects;
  });
  const [popularRanking, setPopularRanking] = useState<string[]>(() => {
    const stored = localStorage.getItem(RANKING_KEY);
    if (stored) {
      return JSON.parse(stored) as string[];
    }
    return [];
  });
  const [hasPendingChanges, setPending] = useState(false);
  const [lastSubmittedAt, setLastSubmittedAt] = useState<string | null>(() => localStorage.getItem(SUBMISSION_KEY));
  const [userProjectId, setUserProjectId] = useState<string | null>(() => localStorage.getItem(OWN_PROJECT_KEY));

  useEffect(() => {
    registerQueueSender(sendBallotToHomeserver);
  }, []);

  const persistState = (updatedProjects: Project[], updatedRanking: string[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProjects));
    localStorage.setItem(RANKING_KEY, JSON.stringify(updatedRanking));
  };

  const mutateProject = (projectId: string, updater: (project: Project) => Project) => {
    setProjects((current) => {
      const updated = current.map((project) => (project.id === projectId ? updater(project) : project));
      persistState(updated, popularRanking);
      setPending(true);
      return updated;
    });
  };

  const updateProjectScore = (projectId: string, component: ScoreComponent, value: number) => {
    mutateProject(projectId, (project) => ({
      ...project,
      scores: { ...project.scores, [component]: value }
    }));
  };

  const toggleReadiness = (projectId: string, ready: boolean) => {
    mutateProject(projectId, (project) => ({ ...project, readiness: ready }));
  };

  const updateComment = (projectId: string, comment: string) => {
    mutateProject(projectId, (project) => ({ ...project, comment }));
  };

  const updateTags = (projectId: string, tags: string[]) => {
    mutateProject(projectId, (project) => ({ ...project, userTags: tags }));
  };

  const submitBallot = async () => {
    if (!user) return;
    const payload: BallotPayload = {
      voterId: user.publicKey,
      submittedAt: new Date().toISOString(),
      popularRanking,
      scores: projects.map((project) => ({
        projectId: project.id,
        scores: project.scores,
        readiness: project.readiness,
        comment: project.comment,
        tags: project.userTags
      }))
    };
    enqueueBallot(payload);
    persistState(projects, popularRanking);
    try {
      await flushQueue(sendBallotToHomeserver);
      setPending(false);
      setLastSubmittedAt(payload.submittedAt);
      localStorage.setItem(SUBMISSION_KEY, payload.submittedAt);
    } catch (error) {
      console.warn('Queue flush failed, will retry when online', error);
    }
  };

  const value = useMemo(
    () => ({
      projects,
      updateProjectScore,
      toggleReadiness,
      updateComment,
      updateTags,
      submitBallot,
      popularRanking,
      setPopularRanking: (ranking: string[]) => {
        const next = ranking.filter((id, index) => ranking.indexOf(id) === index).slice(0, 5);
        setPopularRanking(next);
        localStorage.setItem(RANKING_KEY, JSON.stringify(next));
        setPending(true);
      },
      userProjectId,
      setUserProjectId: (projectId: string | null) => {
        setUserProjectId(projectId);
        if (projectId) {
          localStorage.setItem(OWN_PROJECT_KEY, projectId);
        } else {
          localStorage.removeItem(OWN_PROJECT_KEY);
        }
        setPending(true);
      },
      hasPendingChanges,
      lastSubmittedAt
    }),
    [projects, popularRanking, hasPendingChanges, lastSubmittedAt, userProjectId]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProjects must be used within ProjectProvider');
  return context;
};
