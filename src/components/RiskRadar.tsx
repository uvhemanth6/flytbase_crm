'use client';

import { AlertTriangle, Calendar, TrendingDown } from 'lucide-react';
import type { RiskRadar, Risk } from '@/types/crm';
import { formatDate, daysUntil, getSeverityBadge, titleCase } from '@/lib/utils';

interface Props {
  riskRadar: RiskRadar;
  accountName: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  deadline: '⏰',
  stalled_deal: '🛑',
  stakeholder: '👥',
  competitive: '⚔️',
  technical: '🔧',
  financial: '💰',
  contractual: '📄',
};

export default function RiskRadarPanel({ riskRadar, accountName }: Props) {
  const sorted = [...riskRadar.risks].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.severity] - order[b.severity];
  });

  const critCount = sorted.filter(r => r.severity === 'critical').length;
  const highCount = sorted.filter(r => r.severity === 'high').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <AlertTriangle size={20} className="text-orange-500" />
          What Is About To Go Wrong?
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Risks, deadlines, stalled deals, and stakeholder concerns.
          Last updated: {formatDate(riskRadar.lastUpdated)}
        </p>
      </div>

      {/* Summary */}
      {sorted.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['critical', 'high', 'medium', 'low'] as const).map(sev => {
            const count = sorted.filter(r => r.severity === sev).length;
            const styles: Record<string, { bg: string; text: string }> = {
              critical: { bg: 'bg-red-50 border-red-200', text: 'text-red-700' },
              high: { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
              medium: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700' },
              low: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
            };
            return (
              <div key={sev} className={`rounded-xl border p-4 text-center ${styles[sev].bg}`}>
                <p className={`text-3xl font-bold ${styles[sev].text}`}>{count}</p>
                <p className="text-xs text-gray-500 mt-1 capitalize">{sev}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Risk list */}
      {sorted.length > 0 ? (
        <div className="space-y-3">
          {sorted.map(risk => (
            <RiskCard key={risk.id} risk={risk} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <TrendingDown size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No risks detected</p>
          <p className="text-gray-400 text-sm mt-1">Sync MCP data to detect risks from signals and contract deadlines</p>
        </div>
      )}
    </div>
  );
}

function RiskCard({ risk }: { risk: Risk }) {
  const days = risk.deadline ? daysUntil(risk.deadline) : null;

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden`}>
      <div className="flex">
        <div className={`w-1 shrink-0 ${
          risk.severity === 'critical' ? 'bg-red-500' :
          risk.severity === 'high' ? 'bg-orange-400' :
          risk.severity === 'medium' ? 'bg-yellow-400' : 'bg-blue-400'
        }`} />
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{CATEGORY_ICONS[risk.category] ?? '⚠️'}</span>
              <div>
                <h3 className="font-semibold text-gray-900">{risk.title}</h3>
                <span className="text-xs text-gray-400">{titleCase(risk.category)}</span>
              </div>
            </div>
            <span className={`badge shrink-0 ${getSeverityBadge(risk.severity)}`}>
              {risk.severity}
            </span>
          </div>

          <p className="text-sm text-gray-600 mt-2">{risk.description}</p>

          <div className="flex flex-wrap gap-4 mt-3">
            {risk.deadline && (
              <div className={`flex items-center gap-1.5 text-xs ${
                days !== null && days <= 14 ? 'text-red-600 font-semibold' : 'text-gray-500'
              }`}>
                <Calendar size={12} />
                Deadline: {formatDate(risk.deadline)}
                {days !== null && days >= 0 && ` (${days}d)`}
                {days !== null && days < 0 && ' (PAST)'}
              </div>
            )}
            {risk.dealAffected && (
              <div className="text-xs text-gray-500">
                Affects: {risk.dealAffected}
              </div>
            )}
          </div>

          {risk.mitigationSteps && risk.mitigationSteps.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Mitigation steps:</p>
              <ul className="space-y-1">
                {risk.mitigationSteps.map((step, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                    <span className="shrink-0 w-4 h-4 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-medium">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {risk.sources.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {risk.sources.map(src => (
                <span key={src.id} className="font-mono text-xs bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded text-gray-600">
                  {src.id.length > 20 ? src.id.slice(0, 20) + '…' : src.id}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
