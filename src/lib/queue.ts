/**
 * Persistent rate-limit queue for MCP calls.
 * Stores pending jobs in data/queue.json.
 * One call per 60 seconds max.
 */

import fs from 'fs';
import path from 'path';
import type { MCPQueueEntry } from '@/types/crm';

const DATA_DIR = path.join(process.cwd(), 'data');
const QUEUE_FILE = path.join(DATA_DIR, 'queue.json');
const RATE_LIMIT_MS = 62_000;

interface QueueStore {
  entries: MCPQueueEntry[];
  lastProcessedAt?: string;
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readQueue(): QueueStore {
  ensureDir();
  if (!fs.existsSync(QUEUE_FILE)) return { entries: [] };
  try {
    return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8')) as QueueStore;
  } catch {
    return { entries: [] };
  }
}

function writeQueue(store: QueueStore): void {
  ensureDir();
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

export function enqueue(tool: string, params?: Record<string, unknown>): string {
  const store = readQueue();
  const id = `${tool}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  store.entries.push({
    id,
    tool,
    params,
    createdAt: new Date().toISOString(),
    status: 'pending',
  });
  writeQueue(store);
  return id;
}

export function getQueueStatus(): QueueStore {
  return readQueue();
}

export function canCallNow(): boolean {
  const store = readQueue();
  if (!store.lastProcessedAt) return true;
  const age = Date.now() - new Date(store.lastProcessedAt).getTime();
  return age >= RATE_LIMIT_MS;
}

export function markProcessed(): void {
  const store = readQueue();
  store.lastProcessedAt = new Date().toISOString();
  writeQueue(store);
}

export function markDone(id: string, result: unknown): void {
  const store = readQueue();
  const entry = store.entries.find(e => e.id === id);
  if (entry) {
    entry.status = 'done';
    entry.result = result;
    entry.completedAt = new Date().toISOString();
    writeQueue(store);
  }
}

export function markError(id: string, error: string): void {
  const store = readQueue();
  const entry = store.entries.find(e => e.id === id);
  if (entry) {
    entry.status = 'error';
    entry.error = error;
    entry.completedAt = new Date().toISOString();
    writeQueue(store);
  }
}

export function getPendingCount(): number {
  return readQueue().entries.filter(e => e.status === 'pending').length;
}
