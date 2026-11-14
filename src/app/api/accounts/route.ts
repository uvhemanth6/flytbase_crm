/**
 * /api/accounts — Returns all account summaries from cache.
 * Triggers a background sync if data is stale.
 */

import { NextResponse } from 'next/server';
import { getStale, getFetchedAt } from '@/lib/cache';
import {
  buildEmptyAccount,
  parsePaperwork,
  parseStakeholders,
  parseSignals,
  parseNotes,
  buildPriorityActions,
  buildRisks,
  buildIntelGaps,
} from '@/lib/data-parser';
import type { Account } from '@/types/crm';

// Hard-coded accounts for this engagement
const KNOWN_ACCOUNTS = [
  { id: 'eastern-counties-police-alliance', name: 'Eastern Counties Police Alliance', industry: 'Public Safety' },
  { id: 'aldermoor-industrial-group', name: 'Aldermoor Industrial Group', industry: 'Industrial' },
];

function buildAccount(id: string, name: string, industry: string): Account {
  const paperwork = getStale<unknown>('mcp:get_all_paperwork');
  const signalsRaw = getStale<unknown>('mcp:get_signals');
  const notesRaw = getStale<unknown>(`mcp:list_notes:${id}`);
  const notesAll = getStale<unknown>('mcp:list_notes:all');
  const hasData = !!(paperwork || signalsRaw || notesRaw);

  if (!hasData) {
    return buildEmptyAccount(id, name, industry);
  }

  const bookWorth = parsePaperwork(paperwork, name);
  const signals = parseSignals(signalsRaw, id);
  const notes = parseNotes(notesRaw ?? notesAll, id);
  const powerMap = parseStakeholders(notesRaw ?? notesAll, paperwork, name);
  const riskRadar = buildRisks(signals, paperwork, name);
  const priorityActions = buildPriorityActions(signals, riskRadar.risks, name);
  const rawData = {
    accounts: getStale<unknown>('mcp:get_my_accounts'),
    paperwork,
    signals: signalsRaw,
    team: getStale<unknown>('mcp:get_flytbase_team'),
  };
  const intelGaps = buildIntelGaps(
    { powerMap, bookWorth, riskRadar },
    rawData as Record<string, unknown>,
  );

  const fetchedAt = getFetchedAt('mcp:get_all_paperwork');

  return {
    id, name, industry,
    segment: 'Enterprise',
    rawDataFetched: true,
    lastSyncSuccess: fetchedAt ?? undefined,
    lastSyncAttempt: fetchedAt ?? undefined,
    bookWorth,
    powerMap,
    priorityActions,
    riskRadar,
    intelGaps,
    signals,
    notes,
  };
}

export async function GET() {
  const accounts = KNOWN_ACCOUNTS.map(a => buildAccount(a.id, a.name, a.industry));
  return NextResponse.json({ accounts, generatedAt: new Date().toISOString() });
}
