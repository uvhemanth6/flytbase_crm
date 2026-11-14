/**
 * Persistent rate-limit queue for MCP calls.
 * - Local: writes to <project>/data/queue.json
 * - Vercel: writes to /tmp/queue.json (only writable dir)
 * Falls back to in-memory if filesystem is unavailable.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import type { MCPQueueEntry } from '@/types/crm';

const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = IS_VERCEL ? os.tmpdir() : path.join(process.cwd(), 'data');
const QUEUE_FILE = path.join(DATA_DIR, 'flytbase_queue.json');
const RATE_LIMIT_MS = 62_000;

interface QueueStore {
  entries: MCQueueEntry[];
  lastProcessedAt?: string;
}
// alias to avoid conflict
type MCQueueEntry = MCPQueueEntry;

let memQueue: QueueStore = { entries: [] };

function ensureDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch { /* ignore */ }
}

function readQueue(): QueueStore {
  ensureDir();
  try {
    if (fs.existsSync(QUEUE_FILE)) {
      return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8')) as QueueStore;
    }
  } catch { /* fall through */ }
  return memQueue;
}

function writeQueue(store: QueueStore): void {
  memQueue = store;
  try {
    ensureDir();
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch { /* silent fail */ }
}

export function enqueue(tool: string, params?: Record<string, unknown>): string {
  const store = readQueue();
  const id = `${tool}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  store.entries.push({
    id, tool, params,
    createdAt: new Date().toISOString(),
    status: 'pending',
  });
  writeQueue(store);
  return id;
}

export function getQueueStatus() {
  return readQueue();
}

export function canCallNow(): boolean {
  const store = readQueue();
  if (!store.lastProcessedAt) return true;
  return Date.now() - new Date(store.lastProcessedAt).getTime() >= RATE_LIMIT_MS;
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
