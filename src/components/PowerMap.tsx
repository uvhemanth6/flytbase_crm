'use client';

import { Users, Circle } from 'lucide-react';
import type { PowerMap, Stakeholder } from '@/types/crm';
import { formatDate, getRoleBadge, getRelationshipColor, titleCase } from '@/lib/utils';

interface Props {
  powerMap: PowerMap;
  accountName: string;
}

const ROLE_ICONS: Record<string, string> = {
  decision_maker: '👑',
  budget_owner: '💳',
  signatory: '✍️',
  champion: '🏆',
  blocker: '🚫',
  influencer: '📣',
  user: '👤',
};

const RELATIONSHIP_LABEL: Record<string, string> = {
  strong: 'Strong',
  neutral: 'Neutral',
  at_risk: 'At Risk',
  cold: 'Cold',
  unknown: 'Unknown',
};

export default function PowerMapPanel({ powerMap, accountName }: Props) {
  const decisionMakers = powerMap.stakeholders.filter(s => s.roles.includes('decision_maker'));
  const budgetOwners = powerMap.stakeholders.filter(s => s.roles.includes('budget_owner'));
  const blockers = powerMap.stakeholders.filter(s => s.roles.includes('blocker'));
  const champions = powerMap.stakeholders.filter(s => s.roles.includes('champion'));
  const others = powerMap.stakeholders.filter(
    s => !s.roles.some(r => ['decision_maker', 'budget_owner', 'blocker', 'champion'].includes(r))
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Users size={20} className="text-purple-600" />
          Who Holds The Power?
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Stakeholder roles, relationship status and influence map.
          Last updated: {formatDate(powerMap.lastUpdated)}
        </p>
      </div>

      {/* Quick summary row */}
      {powerMap.stakeholders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <RoleSummaryCard label="Decision Makers" count={decisionMakers.length} emoji="👑" color="purple" />
          <RoleSummaryCard label="Budget Owners" count={budgetOwners.length} emoji="💳" color="green" />
          <RoleSummaryCard label="Champions" count={champions.length} emoji="🏆" color="emerald" />
          <RoleSummaryCard label="Blockers" count={blockers.length} emoji="🚫" color="red" />
        </div>
      )}

      {/* Stakeholder cards */}
      {powerMap.stakeholders.length > 0 ? (
        <div className="space-y-4">
          {/* Priority groups */}
          {[
            { label: 'Decision Makers', list: decisionMakers, accent: 'border-purple-300 bg-purple-50/50' },
            { label: 'Budget Owners', list: budgetOwners, accent: 'border-green-300 bg-green-50/50' },
            { label: 'Champions', list: champions, accent: 'border-emerald-300 bg-emerald-50/50' },
            { label: 'Blockers', list: blockers, accent: 'border-red-300 bg-red-50/50' },
            { label: 'Other Stakeholders', list: others, accent: 'border-gray-200 bg-white' },
          ].filter(g => g.list.length > 0).map(group => (
            <div key={group.label}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{group.label}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.list.map(s => (
                  <StakeholderCard key={s.id} stakeholder={s} accent={group.accent} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <Users size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No stakeholders identified yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Sync MCP data to extract contacts from notes and paperwork
          </p>
        </div>
      )}

      {/* Data gaps */}
      {powerMap.dataGaps.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
          <h4 className="font-semibold text-orange-800 mb-2 text-sm">⚠️ Data Gaps</h4>
          <ul className="space-y-1">
            {powerMap.dataGaps.map((g, i) => (
              <li key={i} className="text-sm text-orange-700">· {g}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StakeholderCard({ stakeholder: s, accent }: { stakeholder: Stakeholder; accent: string }) {
  return (
    <div className={`rounded-xl border p-4 ${accent}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{s.name}</p>
          <p className="text-xs text-gray-500 truncate">{s.title}</p>
          {s.department && <p className="text-xs text-gray-400">{s.department}</p>}
        </div>
        <div className={`text-sm font-semibold ${getRelationshipColor(s.relationship)}`}>
          <Circle size={8} className="inline mr-1 fill-current" />
          {RELATIONSHIP_LABEL[s.relationship] ?? s.relationship}
        </div>
      </div>

      {/* Roles */}
      <div className="flex flex-wrap gap-1 mt-2">
        {s.roles.map(role => (
          <span key={role} className={`badge ${getRoleBadge(role)}`}>
            {ROLE_ICONS[role] ?? ''} {titleCase(role)}
          </span>
        ))}
      </div>

      {/* Meta */}
      <div className="mt-3 space-y-1">
        {s.email && (
          <p className="text-xs text-gray-500 truncate">📧 {s.email}</p>
        )}
        {s.lastContact && (
          <p className="text-xs text-gray-500">🗓 Last contact: {formatDate(s.lastContact)}</p>
        )}
        {s.notes && (
          <p className="text-xs text-gray-500 italic mt-1 line-clamp-2">{s.notes}</p>
        )}
      </div>

      {/* Sources */}
      {s.sources.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {s.sources.map(src => (
            <span key={src.id} className="font-mono text-xs bg-white/80 border border-gray-200 px-1.5 py-0.5 rounded text-blue-700" title={src.label}>
              {src.id.length > 16 ? src.id.slice(0, 16) + '…' : src.id}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function RoleSummaryCard({ label, count, emoji, color }: { label: string; count: number; emoji: string; color: string }) {
  const bg: Record<string, string> = {
    purple: 'bg-purple-50 border-purple-200',
    green: 'bg-green-50 border-green-200',
    emerald: 'bg-emerald-50 border-emerald-200',
    red: 'bg-red-50 border-red-200',
  };
  return (
    <div className={`rounded-xl border p-4 text-center ${bg[color]}`}>
      <span className="text-2xl">{emoji}</span>
      <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
