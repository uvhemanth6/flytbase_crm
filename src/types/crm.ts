// ============================================================
// CRM Type Definitions
// ============================================================

export type VerificationStatus = 'verified' | 'estimated' | 'unverified';

export interface SourceRef {
  id: string;
  type: 'paperwork' | 'note' | 'signal' | 'file' | 'manual';
  label: string;
  date?: string;
}

// --- Book Worth ---
export interface DealValue {
  dealId: string;
  dealName: string;
  value: number;
  currency: string;
  status: VerificationStatus;
  sources: SourceRef[];
  notes?: string;
  renewalDate?: string;
  products?: string[];
}

export interface BookWorth {
  totalVerified: number;
  totalEstimated: number;
  totalUnverified: number;
  currency: string;
  deals: DealValue[];
  lastUpdated: string;
  dataGaps: string[];
}

// --- Power Map ---
export type StakeholderRole =
  | 'decision_maker'
  | 'budget_owner'
  | 'signatory'
  | 'user'
  | 'blocker'
  | 'champion'
  | 'influencer';

export type RelationshipStatus =
  | 'strong'
  | 'neutral'
  | 'at_risk'
  | 'unknown'
  | 'cold';

export interface Stakeholder {
  id: string;
  name: string;
  title: string;
  department?: string;
  roles: StakeholderRole[];
  relationship: RelationshipStatus;
  email?: string;
  linkedIn?: string;
  lastContact?: string;
  notes?: string;
  sources: SourceRef[];
}

export interface PowerMap {
  stakeholders: Stakeholder[];
  lastUpdated: string;
  dataGaps: string[];
}

// --- Priority Actions ---
export type ActionPriority = 1 | 2 | 3;
export type ActionStatus = 'open' | 'in_progress' | 'blocked' | 'done';

export interface PriorityAction {
  id: string;
  rank: ActionPriority;
  title: string;
  description: string;
  owner: string;
  dueDate: string;
  dealAffected: string;
  status: ActionStatus;
  rationale: string;
  sources: SourceRef[];
}

export interface PriorityActions {
  actions: PriorityAction[];
  lastUpdated: string;
}

// --- Risk Radar ---
export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low';
export type RiskCategory =
  | 'deadline'
  | 'stalled_deal'
  | 'stakeholder'
  | 'competitive'
  | 'technical'
  | 'financial'
  | 'contractual';

export interface Risk {
  id: string;
  title: string;
  description: string;
  severity: RiskSeverity;
  category: RiskCategory;
  deadline?: string;
  dealAffected?: string;
  mitigationSteps?: string[];
  sources: SourceRef[];
}

export interface RiskRadar {
  risks: Risk[];
  lastUpdated: string;
}

// --- Intelligence Gaps ---
export interface IntelGap {
  id: string;
  question: string;
  whyItMatters: string;
  whoCanProvide: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
}

export interface IntelGaps {
  gaps: IntelGap[];
  lastUpdated: string;
}

// --- Account ---
export interface Account {
  id: string;
  name: string;
  industry: string;
  segment: string;
  csm?: string;
  healthScore?: number; // 0-100
  lastActivity?: string;
  bookWorth: BookWorth;
  powerMap: PowerMap;
  priorityActions: PriorityActions;
  riskRadar: RiskRadar;
  intelGaps: IntelGaps;
  signals: Signal[];
  notes: Note[];
  rawDataFetched: boolean;
  lastSyncAttempt?: string;
  lastSyncSuccess?: string;
}

// --- Signals ---
export interface Signal {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  accountId: string;
  severity?: RiskSeverity;
  source: string;
}

// --- Notes ---
export interface Note {
  id: string;
  content: string;
  author: string;
  timestamp: string;
  accountId: string;
  tags?: string[];
}

// --- MCP ---
export interface MCPRequest {
  tool: string;
  params?: Record<string, unknown>;
}

export interface MCPQueueEntry {
  id: string;
  tool: string;
  params?: Record<string, unknown>;
  createdAt: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  result?: unknown;
  error?: string;
  completedAt?: string;
}

export interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  fetchedAt: string;
  ttlMs: number;
}

export interface CacheStore {
  entries: Record<string, CacheEntry>;
  lastQueuedAt?: string;
}
