/**
 * /api/sync — Triggers a sequential MCP data fetch for all accounts.
 * Rate limited: each tool call waits 62s.
 * Results are cached to disk so subsequent requests are instant.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  whoami,
  getMyAccounts,
  getAllPaperwork,
  getSignals,
  getFlytbaseTeam,
  listNotes,
  getDataFormat,
} from '@/lib/mcp-client';

export const maxDuration = 300; // 5 min timeout for Vercel

export async function POST(req: NextRequest) {
  const { tools }: { tools?: string[] } = await req.json().catch(() => ({}));
  const toFetch = tools ?? ['whoami', 'get_my_accounts', 'get_all_paperwork', 'get_signals', 'get_flytbase_team', 'list_notes'];

  const results: Record<string, { fromCache: boolean; error?: string }> = {};

  for (const tool of toFetch) {
    try {
      let res;
      if (tool === 'whoami') res = await whoami();
      else if (tool === 'get_my_accounts') res = await getMyAccounts();
      else if (tool === 'get_all_paperwork') res = await getAllPaperwork();
      else if (tool === 'get_signals') res = await getSignals();
      else if (tool === 'get_flytbase_team') res = await getFlytbaseTeam();
      else if (tool === 'list_notes') res = await listNotes();
      else if (tool === 'get_data_format') res = await getDataFormat();
      else {
        results[tool] = { fromCache: false, error: 'Unknown tool' };
        continue;
      }
      results[tool] = { fromCache: res.fromCache };
    } catch (err) {
      results[tool] = { fromCache: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  return NextResponse.json({ results, completedAt: new Date().toISOString() });
}

export async function GET() {
  return NextResponse.json({ message: 'POST to /api/sync to trigger a data sync' });
}
