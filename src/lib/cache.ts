/**
 * Persistent JSON cache for MCP data.
 * - Local dev: writes to <project>/data/cache.json
 * - Vercel:    writes to /tmp/cache.json  (only writable dir on Vercel)
 * Falls back to in-memory if the filesystem is unavailable.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import type { CacheStore, CacheEntry } from '@/types/crm';

// On Vercel process.cwd() is read-only. Use /tmp for writes.
const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = IS_VERCEL ? path.join(os.tmpdir()) : path.join(process.cwd(), 'data');
const CACHE_FILE = path.join(DATA_DIR, 'flytbase_cache.json');

const DEFAULT_TTL_MS = 30 * 60 * 1000;

// In-memory fallback when filesystem writes are blocked
let memStore: CacheStore = { entries: {} };

function ensureDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch { /* ignore — will fall back to memory */ }
}

function readStore(): CacheStore {
  ensureDir();
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
      return JSON.parse(raw) as CacheStore;
    }
  } catch { /* fall through */ }
  return memStore;
}

function writeStore(store: CacheStore): void {
  memStore = store; // always update memory
  try {
    ensureDir();
    fs.writeFileSync(CACHE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch { /* silent fail — memory cache still works */ }
}

export function getCached<T>(key: string): T | null {
  const store = readStore();
  const entry = store.entries[key];
  if (!entry) return null;
  const age = Date.now() - new Date(entry.fetchedAt).getTime();
  if (age > entry.ttlMs) return null;
  return entry.data as T;
}

export function getStale<T>(key: string): T | null {
  const store = readStore();
  const entry = store.entries[key];
  if (!entry) return null;
  return entry.data as T;
}

export function setCached<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
  const store = readStore();
  store.entries[key] = {
    key,
    data,
    fetchedAt: new Date().toISOString(),
    ttlMs,
  } as CacheEntry<T>;
  writeStore(store);
}

export function isCached(key: string): boolean {
  return getCached(key) !== null;
}

export function getFetchedAt(key: string): string | null {
  const store = readStore();
  return store.entries[key]?.fetchedAt ?? null;
}

export function clearCache(key?: string): void {
  if (key) {
    const store = readStore();
    delete store.entries[key];
    writeStore(store);
  } else {
    writeStore({ entries: {} });
  }
}

export function getAllKeys(): string[] {
  return Object.keys(readStore().entries);
}

export function getCacheStats(): {
  totalKeys: number;
  oldestFetch: string | null;
  newestFetch: string | null;
} {
  const store = readStore();
  const keys = Object.keys(store.entries);
  const dates = keys.map(k => store.entries[k].fetchedAt).sort();
  return {
    totalKeys: keys.length,
    oldestFetch: dates[0] ?? null,
    newestFetch: dates[dates.length - 1] ?? null,
  };
}
