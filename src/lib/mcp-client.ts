/**
 * MCP JSON-RPC client.
 * All calls go through this module — token is read server-side only.
 * Rate limit: 1 call per 60 seconds per token.
 * Uses cache.ts to avoid redundant fetches.
 */

import { getCached, setCached, getFetchedAt } from './cache';

const MCP_ENDPOINT =
  process.env.MCP_ENDPOINT ??
  'https://questathon.aihackerscollective.com/api/public/mcp';

// Token is ONLY accessed server-side
function getToken(): string {
  const token = process.env.AQ_TOKEN;
  if (!token) {
    throw new Error('AQ_TOKEN environment variable is not set. Add it to .env.local');
  }
  return token;
}

// Track last call time in-process (supplement to queue.json)
let lastCallTime = 0;
const RATE_LIMIT_MS = 62_000; // 62s to be safe

async function rateLimitedFetch(tool: string, params: Record<string, unknown> = {}) {
  const now = Date.now();
  const sinceLastCall = now - lastCallTime;
  if (lastCallTime > 0 && sinceLastCall < RATE_LIMIT_MS) {
    const wait = RATE_LIMIT_MS - sinceLastCall;
    await new Promise(r => setTimeout(r, wait));
  }
  lastCallTime = Date.now();

  const token = getToken();
  const body = {
    jsonrpc: '2.0',
    id: `${tool}-${Date.now()}`,
    method: 'tools/call',
    params: {
      name: tool,
      arguments: params,
    },
  };

  const res = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MCP HTTP ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (json.error) {
    throw new Error(`MCP error [${json.error.code}]: ${json.error.message}`);
  }

  return json.result;
}

// ---- Public API ----

export async function mcpCall<T = unknown>(
  tool: string,
  params: Record<string, unknown> = {},
  cacheKey?: string,
  ttlMs?: number,
): Promise<{ data: T; fromCache: boolean; fetchedAt: string | null }> {
  const key = cacheKey ?? `mcp:${tool}:${JSON.stringify(params)}`;
  const cached = getCached<T>(key);
  if (cached !== null) {
    return { data: cached, fromCache: true, fetchedAt: getFetchedAt(key) };
  }

  const result = await rateLimitedFetch(tool, params);
  // MCP responses wrap content in result.content[0].text
  let data: T;
  if (result?.content?.[0]?.text) {
    try {
      data = JSON.parse(result.content[0].text) as T;
    } catch {
      data = result.content[0].text as unknown as T;
    }
  } else {
    data = result as T;
  }

  setCached<T>(key, data, ttlMs);
  return { data, fromCache: false, fetchedAt: new Date().toISOString() };
}

// ---- Typed helpers ----

export async function whoami() {
  return mcpCall<Record<string, unknown>>('whoami', {}, 'mcp:whoami');
}

export async function getMyAccounts() {
  return mcpCall<unknown>('get_my_accounts', {}, 'mcp:get_my_accounts');
}

export async function getFile(fileId: string) {
  return mcpCall<unknown>('get_file', { file_id: fileId }, `mcp:get_file:${fileId}`);
}

export async function getAllPaperwork() {
  return mcpCall<unknown>('get_all_paperwork', {}, 'mcp:get_all_paperwork');
}

export async function getSignals() {
  // Signals are time-sensitive — shorter TTL (5 min)
  return mcpCall<unknown>('get_signals', {}, 'mcp:get_signals', 5 * 60 * 1000);
}

export async function getDataFormat() {
  return mcpCall<unknown>('get_data_format', {}, 'mcp:get_data_format');
}

export async function getFlytbaseTeam() {
  return mcpCall<unknown>('get_flytbase_team', {}, 'mcp:get_flytbase_team');
}

export async function listNotes(accountId?: string) {
  const params = accountId ? { account_id: accountId } : {};
  const key = `mcp:list_notes:${accountId ?? 'all'}`;
  return mcpCall<unknown>('list_notes', params, key, 10 * 60 * 1000);
}

export async function writeNote(accountId: string, content: string) {
  // Notes are write-only — no caching
  const token = getToken();
  const body = {
    jsonrpc: '2.0',
    id: `write_note-${Date.now()}`,
    method: 'tools/call',
    params: {
      name: 'write_note',
      arguments: { account_id: accountId, content },
    },
  };
  const res = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`MCP HTTP ${res.status}`);
  }
  return res.json();
}
