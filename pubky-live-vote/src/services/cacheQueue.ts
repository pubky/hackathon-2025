import type { BallotPayload } from '../types/project';

const QUEUE_KEY = 'pubky-live-vote:queue';

type QueueItem = {
  id: string;
  payload: BallotPayload;
  createdAt: string;
};

type Sender = (payload: BallotPayload) => Promise<void>;

let onlineListenerAttached = false;
let registeredSender: Sender | null = null;

const readQueue = (): QueueItem[] => {
  const raw = localStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as QueueItem[];
    return Array.isArray(parsed) ? parsed : [];
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
  const item: QueueItem = {
    id: crypto.randomUUID(),
    payload,
    createdAt: new Date().toISOString()
  };
  queue.push(item);
  writeQueue(queue);
};

export const flushQueue = async (sender: Sender) => {
  const queue = readQueue();
  if (!queue.length) return;
  const remaining: QueueItem[] = [];
  for (const item of queue) {
    try {
      await sender(item.payload);
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

export const registerQueueSender = (sender: Sender) => {
  registeredSender = sender;
  if (onlineListenerAttached || typeof window === 'undefined') return;
  window.addEventListener('online', () => {
    if (registeredSender) {
      void flushQueue(registeredSender);
    }
  });
  onlineListenerAttached = true;
};
