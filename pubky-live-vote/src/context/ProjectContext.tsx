import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import type { BallotPayload, BallotSessionEvent, Project, ScoreComponent } from '../types/project';
import { enqueueBallot, flushQueue, registerQueueSender } from '../services/cacheQueue';
import { createBallotStorageSender } from '../services/homeserverApi';
import { demoProjects } from '../services/sampleProjects';

interface ProjectContextValue {
  projects: Project[];
  updateProjectScore: (projectId: string, component: ScoreComponent, value: number) => void;
  toggleReadiness: (projectId: string, ready: boolean) => void;
  updateComment: (projectId: string, comment: string) => void;
  updateTags: (projectId: string, tags: string[]) => void;
  submitBallot: () => Promise<void>;
  userProjectId: string | null;
  setUserProjectId: (projectId: string | null) => void;
  hasPendingChanges: boolean;
  lastSubmittedAt: string | null;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

const STORAGE_KEY = 'pubky-live-vote:projects';
const SUBMISSION_KEY = 'pubky-live-vote:last-submission';
const OWN_PROJECT_KEY = 'pubky-live-vote:own-project';

const buildSubmissionEvent = (
  submittedAt: string,
  session: ReturnType<typeof useAuth>['session'],
  authMethod: ReturnType<typeof useAuth>['authMethod']
): BallotSessionEvent => {
  let publicKey: string | null = null;
  let sessionId: string | null = null;

  if (session) {
    try {
      if (typeof session.info?.publicKey?.z32 === 'function') {
        publicKey = session.info.publicKey.z32();
      }
    } catch (error) {
      console.warn('Unable to read session public key metadata', error);
    }

    if (session.info && 'sessionId' in session.info) {
      sessionId = (session.info as { sessionId?: string | null }).sessionId ?? null;
    }
  }

  const metadata: Record<string, unknown> = {
    authMethod: authMethod ?? null
  };

  if (typeof navigator !== 'undefined') {
    metadata.userAgent = navigator.userAgent;
    metadata.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  return {
    type: 'ballot_submitted',
    timestamp: submittedAt,
    session: session ? { publicKey, sessionId } : null,
    metadata
  } satisfies BallotSessionEvent;
};

export const ProjectProvider = ({ children }: PropsWithChildren) => {
  const { user, sessionStorage, session, authMethod } = useAuth();
  const [projects, setProjects] = useState<Project[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as Project[];
    }
    return demoProjects;
  });
  const [hasPendingChanges, setPending] = useState(false);
  const [lastSubmittedAt, setLastSubmittedAt] = useState<string | null>(() => localStorage.getItem(SUBMISSION_KEY));
  const [userProjectId, setUserProjectId] = useState<string | null>(() => localStorage.getItem(OWN_PROJECT_KEY));

  useEffect(() => {
    try {
      localStorage.removeItem('pubky-live-vote:popular');
    } catch (error) {
      console.debug('Unable to clear legacy popular vote storage', error);
    }
  }, []);

  useEffect(() => {
    if (!sessionStorage) {
      registerQueueSender(null);
      return;
    }
    const sender = createBallotStorageSender(sessionStorage);
    registerQueueSender(sender);
    void flushQueue(sender);
    return () => {
      registerQueueSender(null);
    };
  }, [sessionStorage]);

  const persistState = (updatedProjects: Project[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProjects));
  };

  const mutateProject = (projectId: string, updater: (project: Project) => Project) => {
    setProjects((current) => {
      const updated = current.map((project) => (project.id === projectId ? updater(project) : project));
      persistState(updated);
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
    if (lastSubmittedAt && !hasPendingChanges) return;
    const submittedAt = new Date().toISOString();
    const submissionEvent = buildSubmissionEvent(submittedAt, session, authMethod);

    const submitableProjects = userProjectId
      ? projects.filter((project) => project.id !== userProjectId)
      : projects;

    const payload: BallotPayload = {
      voterId: user.publicKey,
      submittedAt,
      events: [submissionEvent],
      popularRanking: [],
      scores: submitableProjects.map((project) => ({
        projectId: project.id,
        scores: project.scores,
        readiness: project.readiness,
        comment: project.comment,
        tags: project.userTags
      }))
    };
    enqueueBallot(payload);
    persistState(projects);
    const queueSender = sessionStorage ? createBallotStorageSender(sessionStorage) : null;
    try {
      if (queueSender) {
        await flushQueue(queueSender);
      } else {
        await flushQueue();
      }
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
    [projects, hasPendingChanges, lastSubmittedAt, userProjectId]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProjects must be used within ProjectProvider');
  return context;
};
