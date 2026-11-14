/**
 * /api/notes — Write a note back to MCP.
 * POST body: { accountId: string, content: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeNote } from '@/lib/mcp-client';

export async function POST(req: NextRequest) {
  try {
    const { accountId, content } = await req.json();
    if (!accountId || !content) {
      return NextResponse.json({ error: 'accountId and content are required' }, { status: 400 });
    }
    const result = await writeNote(accountId, content);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
