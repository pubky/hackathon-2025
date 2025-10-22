import type { BallotPayload } from '../types/project';
import { buildBallotStoragePath, type SessionPath } from './homeserverApi';

const QUEUE_KEY = 'pubky-live-vote:queue';

type QueueItem = {
  id: string;
  payload: BallotPayload;
  createdAt: string;
  path: SessionPath;
};

type Sender = (payload: BallotPayload, path: SessionPath) => Promise<void>;

let onlineListenerAttached = false;
let registeredSender: Sender | null = null;

const readQueue = (): QueueItem[] => {
  const raw = localStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<QueueItem>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Partial<QueueItem> & { payload: BallotPayload; id: string } => {
        return Boolean(item?.payload && item?.id);
      })
      .map((item) => ({
        id: item.id,
        payload: item.payload,
        createdAt: item.createdAt ?? new Date().toISOString(),
        path: item.path ?? buildBallotStoragePath(item.payload)
      }));
  } catch (error) {
    console.warn('Failed to read queue, resetting', error);
    return [];
  }
};

const writeQueue = (queue: QueueItem[]) => {
  if (queue.length === 0) {
    localStorage.removeItem(QUEUE_KEY);
  } else {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
};

export const enqueueBallot = (payload: BallotPayload) => {
  const queue = readQueue();
  const path = buildBallotStoragePath(payload);
  const item: QueueItem = {
    id: crypto.randomUUID(),
    payload,
    createdAt: new Date().toISOString(),
    path
  };
  queue.push(item);
  writeQueue(queue);
};

export const flushQueue = async (sender?: Sender) => {
  const activeSender = sender ?? registeredSender;
  if (!activeSender) {
    throw new Error('No queue sender registered');
  }
  const queue = readQueue();
  if (!queue.length) return;
  const remaining: QueueItem[] = [];
  for (const item of queue) {
    try {
      await activeSender(item.payload, item.path);
    } catch (error) {
      console.warn('Failed to send ballot, keeping in queue', error);
      remaining.push(item);
    }
  }
  writeQueue(remaining);
  if (remaining.length) {
    throw new Error('Some submissions could not be synced');
  }
};

export const registerQueueSender = (sender: Sender | null) => {
  registeredSender = sender;
  if (onlineListenerAttached || typeof window === 'undefined') return;
  window.addEventListener('online', () => {
    if (registeredSender) {
      void flushQueue();
    }
  });
  onlineListenerAttached = true;
};
