/**
 * /api/mcp — Server-side MCP proxy + rate-limited queue
 *
 * POST body: { tool: string, params?: object }
 * Returns: { data, fromCache, fetchedAt, error? }
 *
 * AQ_TOKEN is NEVER exposed to the client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { mcpCall } from '@/lib/mcp-client';
import { getCacheStats } from '@/lib/cache';

const ALLOWED_TOOLS = [
  'whoami',
  'get_my_accounts',
  'get_file',
  'get_all_paperwork',
  'get_signals',
  'get_data_format',
  'get_flytbase_team',
  'list_notes',
  'write_note',
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tool, params = {} } = body as { tool: string; params?: Record<string, unknown> };

    if (!tool || !ALLOWED_TOOLS.includes(tool)) {
      return NextResponse.json(
        { error: `Unknown or disallowed tool: ${tool}` },
        { status: 400 },
      );
    }

    const result = await mcpCall(tool, params);
    return NextResponse.json({ ...result, cacheStats: getCacheStats() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Don't leak token errors to client
    const safeMessage = message.replace(/AQ_TOKEN[^\s]*/g, '[REDACTED]');
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    allowedTools: ALLOWED_TOOLS,
    cacheStats: getCacheStats(),
  });
}
