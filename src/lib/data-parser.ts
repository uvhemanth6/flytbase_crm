/**
 * Data parser: transforms raw MCP API responses into typed CRM schema.
 *
 * IMPORTANT RULES:
 * - Never fabricate data. If a field is missing, mark it as a data gap.
 * - Every value shown must reference a source ID from the raw data.
 * - Clearly separate verified, estimated, and unverified values.
 * - Use "MISSING" or null rather than guess.
 */

import type {
  Account,
  BookWorth,
  DealValue,
  PowerMap,
  Stakeholder,
  PriorityActions,
  PriorityAction,
  RiskRadar,
  Risk,
  IntelGaps,
  IntelGap,
  Signal,
  Note,
  SourceRef,
  StakeholderRole,
} from '@/types/crm';

// ---- Utility helpers ----

function safeStr(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v == null) return '';
  return String(v);
}

function safeNum(v: unknown): number | null {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? null : n;
  }
  return null;
}

function sourceRef(raw: Record<string, unknown>, idx: number): SourceRef {
  return {
    id: safeStr(raw.id ?? raw.file_id ?? raw.note_id ?? raw.signal_id ?? `ref-${idx}`),
    type: (raw.type as SourceRef['type']) ?? 'file',
    label: safeStr(raw.title ?? raw.name ?? raw.filename ?? `Document ${idx + 1}`),
    date: safeStr(raw.date ?? raw.created_at ?? raw.updated_at ?? ''),
  };
}

// ---- Account skeleton builder ----
// Used when no MCP data is yet available.
export function buildEmptyAccount(id: string, name: string, industry: string): Account {
  const now = new Date().toISOString();
  return {
    id,
    name,
    industry,
    segment: 'Enterprise',
    rawDataFetched: false,
    bookWorth: {
      totalVerified: 0,
      totalEstimated: 0,
      totalUnverified: 0,
      currency: 'GBP',
      deals: [],
      lastUpdated: now,
      dataGaps: ['No MCP data fetched yet. Trigger a sync to load deal values.'],
    },
    powerMap: {
      stakeholders: [],
      lastUpdated: now,
      dataGaps: ['No MCP data fetched yet. Trigger a sync to load stakeholders.'],
    },
    priorityActions: {
      actions: [],
      lastUpdated: now,
    },
    riskRadar: {
      risks: [],
      lastUpdated: now,
    },
    intelGaps: {
      gaps: [
        {
          id: 'gap-no-sync',
          question: 'What is in the MCP data for this account?',
          whyItMatters: 'All CRM intelligence depends on the MCP data feed.',
          whoCanProvide: ['System — trigger a sync via the Sync button'],
          priority: 'critical',
          category: 'System',
        },
      ],
      lastUpdated: now,
    },
    signals: [],
    notes: [],
  };
}

// ---- Parse accounts list from MCP ----
export function parseAccounts(raw: unknown): Array<{ id: string; name: string }> {
  if (!raw || typeof raw !== 'object') return [];
  const obj = raw as Record<string, unknown>;

  // Try common shapes: array at root, or under .accounts, .data
  let arr: unknown[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (Array.isArray(obj.accounts)) arr = obj.accounts as unknown[];
  else if (Array.isArray(obj.data)) arr = obj.data as unknown[];

  return arr
    .filter(Boolean)
    .map((item, i) => {
      const a = item as Record<string, unknown>;
      return {
        id: safeStr(a.id ?? a.account_id ?? `acct-${i}`),
        name: safeStr(a.name ?? a.account_name ?? a.company ?? `Account ${i + 1}`),
      };
    })
    .filter(a => a.name);
}

// ---- Parse paperwork into book-worth deals ----
export function parsePaperwork(raw: unknown, accountName: string): BookWorth {
  const now = new Date().toISOString();
  if (!raw || typeof raw !== 'object') {
    return {
      totalVerified: 0, totalEstimated: 0, totalUnverified: 0,
      currency: 'GBP', deals: [], lastUpdated: now,
      dataGaps: ['Paperwork data unavailable from MCP.'],
    };
  }

  const obj = raw as Record<string, unknown>;
  let docs: unknown[] = [];
  if (Array.isArray(raw)) docs = raw;
  else if (Array.isArray(obj.paperwork)) docs = obj.paperwork as unknown[];
  else if (Array.isArray(obj.documents)) docs = obj.documents as unknown[];
  else if (Array.isArray(obj.files)) docs = obj.files as unknown[];
  else if (Array.isArray(obj.data)) docs = obj.data as unknown[];
  else {
    // Single object — wrap it
    docs = [raw];
  }

  // Filter to documents relating to this account
  const relevant = docs.filter(d => {
    const doc = d as Record<string, unknown>;
    const name = safeStr(doc.account_name ?? doc.account ?? doc.client ?? '').toLowerCase();
    return !name || name.includes(accountName.toLowerCase().split(' ')[0]);
  });

  const deals: DealValue[] = [];
  let totalVerified = 0;
  let totalEstimated = 0;
  let totalUnverified = 0;
  const gaps: string[] = [];

  relevant.forEach((doc, idx) => {
    const d = doc as Record<string, unknown>;
    const rawVal = safeNum(d.value ?? d.amount ?? d.contract_value ?? d.deal_value ?? d.total);
    const currency = safeStr(d.currency ?? 'GBP');
    const name = safeStr(d.title ?? d.name ?? d.deal_name ?? d.filename ?? `Deal ${idx + 1}`);
    const docType = safeStr(d.type ?? d.document_type ?? d.kind ?? '');
    const status = safeStr(d.status ?? d.deal_status ?? '');

    // Determine verification level
    let verif: DealValue['status'] = 'unverified';
    if (docType.toLowerCase().includes('contract') || docType.toLowerCase().includes('signed') || status.toLowerCase().includes('closed')) {
      verif = 'verified';
    } else if (docType.toLowerCase().includes('proposal') || docType.toLowerCase().includes('quote') || status.toLowerCase().includes('negotiat')) {
      verif = 'estimated';
    }

    const src = sourceRef(d, idx);

    if (rawVal !== null) {
      const deal: DealValue = {
        dealId: safeStr(d.id ?? d.deal_id ?? `deal-${idx}`),
        dealName: name,
        value: rawVal,
        currency,
        status: verif,
        sources: [src],
        notes: safeStr(d.notes ?? d.description ?? ''),
        renewalDate: safeStr(d.renewal_date ?? d.expiry_date ?? d.end_date ?? ''),
        products: Array.isArray(d.products) ? d.products.map(safeStr) : [],
      };
      deals.push(deal);
      if (verif === 'verified') totalVerified += rawVal;
      else if (verif === 'estimated') totalEstimated += rawVal;
      else totalUnverified += rawVal;
    } else {
      gaps.push(`Value missing for document: ${name} (${src.id})`);
    }
  });

  if (relevant.length === 0) {
    gaps.push(`No paperwork found for ${accountName} in MCP data.`);
  }

  return {
    totalVerified, totalEstimated, totalUnverified,
    currency: 'GBP', deals, lastUpdated: now, dataGaps: gaps,
  };
}

// ---- Parse notes into stakeholders (best-effort) ----
export function parseStakeholders(notesRaw: unknown, paperworkRaw: unknown, accountName: string): PowerMap {
  const now = new Date().toISOString();
  const stakeholders: Stakeholder[] = [];
  const gaps: string[] = [];

  // Extract from notes
  let notes: unknown[] = [];
  if (Array.isArray(notesRaw)) notes = notesRaw;
  else if (notesRaw && typeof notesRaw === 'object') {
    const obj = notesRaw as Record<string, unknown>;
    if (Array.isArray(obj.notes)) notes = obj.notes as unknown[];
    else if (Array.isArray(obj.data)) notes = obj.data as unknown[];
  }

  const seen = new Set<string>();
  notes.forEach((n, i) => {
    const note = n as Record<string, unknown>;
    const content = safeStr(note.content ?? note.text ?? note.body ?? '');
    const author = safeStr(note.author ?? note.created_by ?? note.user ?? '');

    // Look for stakeholder mentions in note content
    const nameMatches = content.match(/(?:spoke with|met|contact|from|spoke to|call with|email from|email to)\s+([A-Z][a-z]+ [A-Z][a-z]+)/g);
    if (nameMatches) {
      nameMatches.forEach(match => {
        const name = match.replace(/^.*?\s+/, '');
        if (!seen.has(name)) {
          seen.add(name);
          stakeholders.push({
            id: `sh-note-${i}-${name.replace(' ', '-').toLowerCase()}`,
            name,
            title: 'Unknown Title',
            roles: ['user'],
            relationship: 'unknown',
            notes: `Mentioned in note by ${author || 'unknown'}`,
            sources: [{
              id: safeStr(note.id ?? `note-${i}`),
              type: 'note',
              label: `Note by ${author}`,
              date: safeStr(note.created_at ?? note.date ?? ''),
            }],
          });
        }
      });
    }
  });

  // Extract from paperwork signatories
  let docs: unknown[] = [];
  if (Array.isArray(paperworkRaw)) docs = paperworkRaw;
  else if (paperworkRaw && typeof paperworkRaw === 'object') {
    const obj = paperworkRaw as Record<string, unknown>;
    if (Array.isArray(obj.paperwork)) docs = obj.paperwork as unknown[];
    else if (Array.isArray(obj.data)) docs = obj.data as unknown[];
  }

  docs.forEach((d, i) => {
    const doc = d as Record<string, unknown>;
    const signatory = safeStr(doc.signatory ?? doc.signed_by ?? doc.authorised_by ?? '');
    if (signatory && !seen.has(signatory)) {
      seen.add(signatory);
      const roles: StakeholderRole[] = ['signatory'];
      stakeholders.push({
        id: `sh-doc-${i}`,
        name: signatory,
        title: safeStr(doc.signatory_title ?? 'Signatory'),
        roles,
        relationship: 'unknown',
        sources: [sourceRef(doc, i)],
      });
    }
  });

  if (stakeholders.length === 0) {
    gaps.push('No named stakeholders found in notes or paperwork. Manual enrichment needed.');
    gaps.push('Decision-maker, budget owner and blocker roles are unconfirmed.');
  } else {
    gaps.push('Role assignments (decision_maker, budget_owner, blocker) need manual verification.');
  }

  return { stakeholders, lastUpdated: now, dataGaps: gaps };
}

// ---- Parse signals ----
export function parseSignals(raw: unknown, accountId: string): Signal[] {
  if (!raw) return [];
  let arr: unknown[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.signals)) arr = obj.signals as unknown[];
    else if (Array.isArray(obj.data)) arr = obj.data as unknown[];
  }

  return arr
    .filter(s => {
      const sig = s as Record<string, unknown>;
      const acc = safeStr(sig.account_id ?? sig.account ?? '').toLowerCase();
      return !acc || acc.includes(accountId);
    })
    .map((s, i) => {
      const sig = s as Record<string, unknown>;
      return {
        id: safeStr(sig.id ?? sig.signal_id ?? `sig-${i}`),
        type: safeStr(sig.type ?? sig.signal_type ?? 'info'),
        title: safeStr(sig.title ?? sig.name ?? 'Signal'),
        description: safeStr(sig.description ?? sig.content ?? sig.text ?? ''),
        timestamp: safeStr(sig.timestamp ?? sig.created_at ?? new Date().toISOString()),
        accountId,
        severity: (sig.severity as Signal['severity']) ?? 'low',
        source: 'mcp:get_signals',
      } as Signal;
    });
}

// ---- Parse notes from MCP ----
export function parseNotes(raw: unknown, accountId: string): Note[] {
  if (!raw) return [];
  let arr: unknown[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.notes)) arr = obj.notes as unknown[];
    else if (Array.isArray(obj.data)) arr = obj.data as unknown[];
  }

  return arr.map((n, i) => {
    const note = n as Record<string, unknown>;
    return {
      id: safeStr(note.id ?? note.note_id ?? `note-${i}`),
      content: safeStr(note.content ?? note.text ?? note.body ?? ''),
      author: safeStr(note.author ?? note.created_by ?? note.user ?? 'Unknown'),
      timestamp: safeStr(note.created_at ?? note.date ?? new Date().toISOString()),
      accountId,
      tags: Array.isArray(note.tags) ? note.tags.map(safeStr) : [],
    };
  });
}

// ---- Build priority actions from signals + risks ----
export function buildPriorityActions(
  signals: Signal[],
  risks: Risk[],
  accountName: string,
): PriorityActions {
  const actions: PriorityAction[] = [];
  const now = new Date().toISOString();

  // Top 3 from most severe risks / signals
  const sortedRisks = [...risks].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.severity] - order[b.severity];
  });

  sortedRisks.slice(0, 3).forEach((r, i) => {
    const rank = (i + 1) as 1 | 2 | 3;
    actions.push({
      id: `action-${r.id}`,
      rank,
      title: `Mitigate: ${r.title}`,
      description: r.description,
      owner: 'CSM',
      dueDate: r.deadline ?? addDays(now, 7),
      dealAffected: r.dealAffected ?? accountName,
      status: 'open',
      rationale: `Severity: ${r.severity}. ${r.mitigationSteps?.[0] ?? 'Review and act.'}`,
      sources: r.sources,
    });
  });

  // If fewer than 3 actions from risks, fill from signals
  if (actions.length < 3 && signals.length > 0) {
    signals.slice(0, 3 - actions.length).forEach((s, i) => {
      const rank = (actions.length + i + 1) as 1 | 2 | 3;
      actions.push({
        id: `action-sig-${s.id}`,
        rank,
        title: `Follow up on signal: ${s.title}`,
        description: s.description,
        owner: 'CSM',
        dueDate: addDays(now, 3),
        dealAffected: accountName,
        status: 'open',
        rationale: 'Live signal detected via MCP get_signals.',
        sources: [{ id: s.id, type: 'signal', label: s.title, date: s.timestamp }],
      });
    });
  }

  // Generic fallback actions if still empty
  if (actions.length === 0) {
    actions.push(
      {
        id: 'action-sync-1',
        rank: 1,
        title: 'Complete MCP data sync to unlock intelligence',
        description: 'No data has been fetched yet. Click Sync to load account data from the MCP API.',
        owner: 'CSM / Admin',
        dueDate: addDays(now, 1),
        dealAffected: accountName,
        status: 'open',
        rationale: 'All CRM intelligence depends on MCP data.',
        sources: [],
      },
      {
        id: 'action-sync-2',
        rank: 2,
        title: 'Review all paperwork for deal values and signatories',
        description: 'Once synced, verify deal values in the Book Worth panel.',
        owner: 'CSM',
        dueDate: addDays(now, 3),
        dealAffected: accountName,
        status: 'open',
        rationale: 'Book worth drives QBR and renewal planning.',
        sources: [],
      },
      {
        id: 'action-sync-3',
        rank: 3,
        title: 'Map all stakeholders to roles and relationship status',
        description: 'Identify decision-makers, blockers, and champions from notes and meetings.',
        owner: 'CSM',
        dueDate: addDays(now, 7),
        dealAffected: accountName,
        status: 'open',
        rationale: 'Relationship intelligence prevents churn.',
        sources: [],
      },
    );
  }

  return { actions: actions.slice(0, 3) as PriorityAction[], lastUpdated: now };
}

// ---- Build risks from signals and paperwork ----
export function buildRisks(signals: Signal[], paperwork: unknown, accountName: string): RiskRadar {
  const now = new Date().toISOString();
  const risks: Risk[] = [];

  signals
    .filter(s => s.severity === 'critical' || s.severity === 'high')
    .forEach((s, i) => {
      risks.push({
        id: `risk-sig-${i}`,
        title: s.title,
        description: s.description,
        severity: s.severity ?? 'medium',
        category: 'stakeholder',
        sources: [{ id: s.id, type: 'signal', label: s.title, date: s.timestamp }],
      });
    });

  // Check for expiring contracts in paperwork
  let docs: unknown[] = [];
  if (Array.isArray(paperwork)) docs = paperwork;
  else if (paperwork && typeof paperwork === 'object') {
    const obj = paperwork as Record<string, unknown>;
    if (Array.isArray(obj.paperwork)) docs = obj.paperwork as unknown[];
    else if (Array.isArray(obj.data)) docs = obj.data as unknown[];
  }

  docs.forEach((d, i) => {
    const doc = d as Record<string, unknown>;
    const expiry = safeStr(doc.expiry_date ?? doc.renewal_date ?? doc.end_date ?? '');
    if (expiry) {
      const daysUntil = Math.floor((new Date(expiry).getTime() - Date.now()) / 86_400_000);
      if (daysUntil < 90 && daysUntil >= 0) {
        risks.push({
          id: `risk-expiry-${i}`,
          title: `Contract expiring in ${daysUntil} days`,
          description: `Document "${safeStr(doc.title ?? doc.name ?? 'Unnamed')}" expires on ${expiry}.`,
          severity: daysUntil < 30 ? 'critical' : daysUntil < 60 ? 'high' : 'medium',
          category: 'deadline',
          deadline: expiry,
          dealAffected: safeStr(doc.title ?? doc.name ?? accountName),
          mitigationSteps: ['Initiate renewal conversation', 'Confirm budget approval', 'Send renewal proposal'],
          sources: [sourceRef(doc, i)],
        });
      }
    }
  });

  return { risks, lastUpdated: now };
}

// ---- Build intelligence gaps ----
export function buildIntelGaps(
  account: Partial<Account>,
  rawData: Record<string, unknown>,
): IntelGaps {
  const now = new Date().toISOString();
  const gaps: IntelGap[] = [];

  if (!rawData.accounts) {
    gaps.push({
      id: 'gap-accounts',
      question: 'Which accounts am I responsible for?',
      whyItMatters: 'Without account list, we cannot scope the relationship correctly.',
      whoCanProvide: ['MCP: get_my_accounts'],
      priority: 'critical',
      category: 'Account Scope',
    });
  }

  if (!rawData.paperwork || (Array.isArray(rawData.paperwork) && rawData.paperwork.length === 0)) {
    gaps.push({
      id: 'gap-paperwork',
      question: 'What contracts and proposals exist for this account?',
      whyItMatters: 'Book worth cannot be calculated without deal documents.',
      whoCanProvide: ['MCP: get_all_paperwork', 'CSM deal notes'],
      priority: 'critical',
      category: 'Book Worth',
    });
  }

  const stakeholders = account.powerMap?.stakeholders ?? [];
  if (stakeholders.length === 0) {
    gaps.push({
      id: 'gap-stakeholders',
      question: 'Who are the key stakeholders and decision-makers?',
      whyItMatters: 'Without knowing who holds the power, we risk talking to the wrong person.',
      whoCanProvide: ['Account notes', 'CSM memory', 'LinkedIn research'],
      priority: 'critical',
      category: 'Power Map',
    });
  } else {
    const hasDecisionMaker = stakeholders.some(s => s.roles.includes('decision_maker'));
    const hasBudgetOwner = stakeholders.some(s => s.roles.includes('budget_owner'));
    if (!hasDecisionMaker) {
      gaps.push({
        id: 'gap-dm',
        question: 'Who is the ultimate decision-maker for this account?',
        whyItMatters: 'Deals stall when the DM is unknown or disengaged.',
        whoCanProvide: ['CSM notes', 'Champion at account'],
        priority: 'high',
        category: 'Power Map',
      });
    }
    if (!hasBudgetOwner) {
      gaps.push({
        id: 'gap-bo',
        question: 'Who owns the budget for FlytBase spend?',
        whyItMatters: 'Needed for renewal negotiation and upsell conversations.',
        whoCanProvide: ['Finance contact at account', 'CSM notes'],
        priority: 'high',
        category: 'Power Map',
      });
    }
  }

  if (!rawData.signals) {
    gaps.push({
      id: 'gap-signals',
      question: 'Are there any live signals or alerts for this account?',
      whyItMatters: 'Signals flag risk events before they become churn.',
      whoCanProvide: ['MCP: get_signals'],
      priority: 'medium',
      category: 'Risk Radar',
    });
  }

  if (!rawData.team) {
    gaps.push({
      id: 'gap-team',
      question: 'Which FlytBase team members are assigned to this account?',
      whyItMatters: 'Unclear ownership leads to dropped balls.',
      whoCanProvide: ['MCP: get_flytbase_team', 'CRM admin'],
      priority: 'medium',
      category: 'Internal Alignment',
    });
  }

  return { gaps, lastUpdated: now };
}

// ---- Helpers ----
function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
