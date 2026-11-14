'use client';

import { Search, HelpCircle } from 'lucide-react';
import type { IntelGaps, IntelGap } from '@/types/crm';
import { formatDate, getSeverityBadge, titleCase } from '@/lib/utils';

interface Props {
  intelGaps: IntelGaps;
  accountName: string;
}

export default function IntelGapsPanel({ intelGaps, accountName }: Props) {
  const sorted = [...intelGaps.gaps].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.priority] - order[b.priority];
  });

  const critCount = sorted.filter(g => g.priority === 'critical').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Search size={20} className="text-indigo-600" />
          What Do We Still Not Know?
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Missing information, why it matters, and who can provide it.
          Last updated: {formatDate(intelGaps.lastUpdated)}
        </p>
      </div>

      {critCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <HelpCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">{critCount} critical knowledge gap{critCount !== 1 ? 's' : ''}</p>
            <p className="text-xs text-red-600 mt-0.5">These gaps block key decisions. Resolve them first.</p>
          </div>
        </div>
      )}

      {sorted.length > 0 ? (
        <div className="space-y-3">
          {sorted.map(gap => (
            <GapCard key={gap.id} gap={gap} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <Search size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No gaps identified</p>
          <p className="text-gray-400 text-sm mt-1">Sync MCP data to detect intelligence gaps</p>
        </div>
      )}
    </div>
  );
}

function GapCard({ gap }: { gap: IntelGap }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
            <HelpCircle size={16} className="text-indigo-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{gap.question}</p>
            <span className="text-xs text-gray-400">{gap.category}</span>
          </div>
        </div>
        <span className={`badge shrink-0 ${getSeverityBadge(gap.priority)}`}>
          {gap.priority}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-amber-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-700 mb-1">Why it matters</p>
          <p className="text-sm text-amber-800">{gap.whyItMatters}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-700 mb-1">Who can provide it</p>
          <ul className="space-y-0.5">
            {gap.whoCanProvide.map((who, i) => (
              <li key={i} className="text-sm text-blue-800 flex items-center gap-1.5">
                <span>·</span> {who}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
