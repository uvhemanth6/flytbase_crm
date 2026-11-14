/**
 * Persistent JSON cache for MCP data.
 * Stores fetched records with timestamps to avoid re-fetching within TTL.
 * Uses the local filesystem (data/cache.json) for persistence across restarts.
 */

import fs from 'fs';
import path from 'path';
import type { CacheStore, CacheEntry } from '@/types/crm';

const DATA_DIR = path.join(process.cwd(), 'data');
const CACHE_FILE = path.join(DATA_DIR, 'cache.json');

// Default TTL: 30 minutes (MCP is rate-limited, so cache generously)
const DEFAULT_TTL_MS = 30 * 60 * 1000;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readStore(): CacheStore {
  ensureDir();
  if (!fs.existsSync(CACHE_FILE)) {
    return { entries: {} };
  }
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    return JSON.parse(raw) as CacheStore;
  } catch {
    return { entries: {} };
  }
}

function writeStore(store: CacheStore): void {
  ensureDir();
  fs.writeFileSync(CACHE_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

export function getCached<T>(key: string): T | null {
  const store = readStore();
  const entry = store.entries[key];
  if (!entry) return null;
  const age = Date.now() - new Date(entry.fetchedAt).getTime();
  if (age > entry.ttlMs) {
    // Expired — but don't delete yet, caller may use stale
    return null;
  }
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

export function getCacheStats(): { totalKeys: number; oldestFetch: string | null; newestFetch: string | null } {
  const store = readStore();
  const keys = Object.keys(store.entries);
  const dates = keys.map(k => store.entries[k].fetchedAt).sort();
  return {
    totalKeys: keys.length,
    oldestFetch: dates[0] ?? null,
    newestFetch: dates[dates.length - 1] ?? null,
  };
}
