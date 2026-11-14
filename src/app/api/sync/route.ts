/**
 * /api/sync — Fetches ONE MCP tool per call. No sleeping.
 *
 * POST body: { tool: string }
 *
 * The frontend calls this once per tool, waiting 62s between calls.
 * This keeps each serverless invocation well under Vercel's 10s timeout.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  whoami, getMyAccounts, getAllPaperwork,
  getSignals, getFlytbaseTeam, listNotes, getDataFormat,
} from '@/lib/mcp-client';
import { getCacheStats } from '@/lib/cache';

export const maxDuration = 10;

const TOOL_MAP: Record<string, () => Promise<unknown>> = {
  whoami,
  get_my_accounts: getMyAccounts,
  get_all_paperwork: getAllPaperwork,
  get_signals: getSignals,
  get_flytbase_team: getFlytbaseTeam,
  list_notes: listNotes,
  get_data_format: getDataFormat,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const tool = (body.tool as string) ?? '';

    if (!tool || !TOOL_MAP[tool]) {
      // Legacy: if no specific tool given, return available tools list
      return NextResponse.json({
        error: 'Specify a single tool. Available: ' + Object.keys(TOOL_MAP).join(', '),
        availableTools: Object.keys(TOOL_MAP),
      }, { status: 400 });
    }

    const result = await TOOL_MAP[tool]();
    return NextResponse.json({
      tool,
      fromCache: (result as { fromCache?: boolean }).fromCache ?? false,
      fetchedAt: (result as { fetchedAt?: string }).fetchedAt ?? null,
      cacheStats: getCacheStats(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Never leak the actual token value
    const safe = message.replace(/Bearer\s+\S+/g, 'Bearer [REDACTED]');
    const isTokenError = safe.includes('AQ_TOKEN');
    return NextResponse.json(
      { error: safe, isTokenError },
      { status: isTokenError ? 401 : 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    usage: 'POST { "tool": "<name>" } to fetch one tool at a time',
    availableTools: Object.keys(TOOL_MAP),
    cacheStats: getCacheStats(),
  });
}
