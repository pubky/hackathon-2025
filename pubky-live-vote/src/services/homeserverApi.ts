import type { Address, Session } from '@synonymdev/pubky';
import type { BallotPayload, LeaderboardSummaryResponse } from '../types/project';
import { ensurePubkyClient, getHomeserverConfig } from './pubkyClient';

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

const fetchPublicStorageJson = async <T>(path: string): Promise<T> => {
  const { homeserverPublicKey } = getHomeserverConfig();
  const normalizedPath = path.replace(/^\//, '');
  const addr: Address = `pubky${homeserverPublicKey}/pub/${normalizedPath}`;
  const client = await ensurePubkyClient();
  if (!client.publicStorage) {
    throw new Error('Pubky public storage is unavailable');
  }
  return (await client.publicStorage.getJson(addr)) as T;
};

export const fetchLeaderboardSummary = async (): Promise<LeaderboardSummaryResponse | null> => {
  try {
    return await fetchPublicStorageJson<LeaderboardSummaryResponse>(SUMMARY_PATH);
  } catch (error) {
    console.debug('Leaderboard summary unavailable, falling back to ballots', error);
    return null;
  }
};

export const fetchBallotSnapshot = async (): Promise<BallotPayload[]> => {
  try {
    return await fetchPublicStorageJson<BallotPayload[]>(BALLOT_INDEX_PATH);
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
