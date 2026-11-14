/**
 * MCP JSON-RPC client.
 * Token is read server-side ONLY. Never expose to client.
 *
 * Rate limit: 1 call per 60s per token (enforced by MCP server).
 * We do NOT sleep here — that breaks Vercel's 10s timeout.
 * Instead: the frontend staggers calls with 62s delays.
 */

import { getCached, setCached, getFetchedAt } from './cache';

const MCP_ENDPOINT =
  process.env.MCP_ENDPOINT ??
  'https://questathon.aihackerscollective.com/api/public/mcp';

function getToken(): string {
  const token = process.env.AQ_TOKEN;
  if (!token) {
    throw new Error('AQ_TOKEN is not configured. Add it to your Vercel Environment Variables (or .env.local for local dev).');
  }
  return token;
}

async function callMCP(tool: string, params: Record<string, unknown> = {}) {
  const token = getToken();

  const body = {
    jsonrpc: '2.0',
    id: `${tool}-${Date.now()}`,
    method: 'tools/call',
    params: { name: tool, arguments: params },
  };

  const res = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    // Vercel has a 10s limit — MCP should respond well within that
    signal: AbortSignal.timeout(9000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`MCP HTTP ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (json.error) {
    throw new Error(`MCP [${json.error.code}]: ${json.error.message}`);
  }
  return json.result;
}

function parseResult<T>(result: unknown): T {
  if (result && typeof result === 'object') {
    const r = result as Record<string, unknown>;
    if (Array.isArray(r.content) && r.content.length > 0) {
      const first = r.content[0] as Record<string, unknown>;
      if (typeof first.text === 'string') {
        try { return JSON.parse(first.text) as T; } catch { return first.text as unknown as T; }
      }
    }
  }
  return result as T;
}

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

  const result = await callMCP(tool, params);
  const data = parseResult<T>(result);
  setCached<T>(key, data, ttlMs);
  return { data, fromCache: false, fetchedAt: new Date().toISOString() };
}

// ---- Typed helpers ----
export const whoami = () => mcpCall('whoami', {}, 'mcp:whoami');
export const getMyAccounts = () => mcpCall('get_my_accounts', {}, 'mcp:get_my_accounts');
export const getFile = (fileId: string) => mcpCall('get_file', { file_id: fileId }, `mcp:get_file:${fileId}`);
export const getAllPaperwork = () => mcpCall('get_all_paperwork', {}, 'mcp:get_all_paperwork');
export const getSignals = () => mcpCall('get_signals', {}, 'mcp:get_signals', 5 * 60 * 1000);
export const getDataFormat = () => mcpCall('get_data_format', {}, 'mcp:get_data_format');
export const getFlytbaseTeam = () => mcpCall('get_flytbase_team', {}, 'mcp:get_flytbase_team');
export const listNotes = (accountId?: string) =>
  mcpCall('list_notes', accountId ? { account_id: accountId } : {}, `mcp:list_notes:${accountId ?? 'all'}`, 10 * 60 * 1000);

export async function writeNote(accountId: string, content: string) {
  const token = getToken();
  const body = {
    jsonrpc: '2.0', id: `write_note-${Date.now()}`,
    method: 'tools/call',
    params: { name: 'write_note', arguments: { account_id: accountId, content } },
  };
  const res = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(9000),
  });
  if (!res.ok) throw new Error(`MCP HTTP ${res.status}`);
  return res.json();
}
