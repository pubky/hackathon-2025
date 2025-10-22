import type { Session } from '@synonymdev/pubky';
import type { BallotPayload, LeaderboardSummaryResponse } from '../types/project';
import { getHomeserverConfig } from './pubkyClient';

export type SessionPath = `/pub/${string}`;

const DATA_ROOT = 'pubky-live-vote/ballots';
const SUMMARY_PATH = 'pubky-live-vote/summary.json';
const BALLOT_INDEX_PATH = `${DATA_ROOT}/index.json`;
const MOCK_STORAGE_PREFIX = 'pubky-live-vote:mock-storage:';
const CANONICAL_STORAGE_ROOT = `/pub/${DATA_ROOT}`;

export const buildBallotStoragePath = (payload: Pick<BallotPayload, 'voterId'>): SessionPath => {
  return `${CANONICAL_STORAGE_ROOT}/${payload.voterId}.json` as SessionPath;
};

export const createBallotStorageSender = (storage: Session['storage']) => {
  return async (payload: BallotPayload, explicitPath?: SessionPath) => {
    const path = explicitPath ?? buildBallotStoragePath(payload);
    await storage.putJson(path, payload);
  };
};

const buildHomeserverUrl = (path: string) => {
  const { homeserverUrl } = getHomeserverConfig();
  const trimmedBase = homeserverUrl.replace(/\/$/, '');
  const trimmedPath = path.replace(/^\//, '');
  return `${trimmedBase}/${trimmedPath}`;
};

const fetchJson = async <T>(path: string): Promise<T> => {
  const url = buildHomeserverUrl(path);
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
};

export const fetchLeaderboardSummary = async (): Promise<LeaderboardSummaryResponse | null> => {
  try {
    return await fetchJson<LeaderboardSummaryResponse>(SUMMARY_PATH);
  } catch (error) {
    console.debug('Leaderboard summary unavailable, falling back to ballots', error);
    return null;
  }
};

export const fetchBallotSnapshot = async (): Promise<BallotPayload[]> => {
  try {
    return await fetchJson<BallotPayload[]>(BALLOT_INDEX_PATH);
  } catch (error) {
    console.debug('Ballot index unavailable, checking mock storage', error);
    return readMockBallots();
  }
};

const readMockBallots = (): BallotPayload[] => {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  const ballots: BallotPayload[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith(`${MOCK_STORAGE_PREFIX}${DATA_ROOT}/`)) continue;
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    try {
      ballots.push(JSON.parse(raw) as BallotPayload);
    } catch (error) {
      console.warn('Unable to parse mock ballot', error);
    }
  }
  return ballots;
};
