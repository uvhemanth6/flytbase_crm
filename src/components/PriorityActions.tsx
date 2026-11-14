'use client';

import { Target, Calendar, User, AlertCircle } from 'lucide-react';
import type { PriorityActions, PriorityAction } from '@/types/crm';
import { formatDate, daysUntil } from '@/lib/utils';

interface Props {
  actions: PriorityActions;
  accountName: string;
}

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  blocked: 'bg-red-100 text-red-800',
  done: 'bg-emerald-100 text-emerald-800',
};

const RANK_COLORS = ['bg-red-500', 'bg-orange-400', 'bg-amber-400'];

export default function PriorityActionsPanel({ actions, accountName }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Target size={20} className="text-blue-600" />
          What Do We Do First?
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Three ranked actions · Last updated: {formatDate(actions.lastUpdated)}
        </p>
      </div>

      {actions.actions.length > 0 ? (
        <div className="space-y-4">
          {actions.actions.map(action => (
            <ActionCard key={action.id} action={action} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <Target size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No actions derived yet</p>
          <p className="text-gray-400 text-sm mt-1">Sync MCP data to generate priority actions from risks and signals</p>
        </div>
      )}
    </div>
  );
}

function ActionCard({ action }: { action: PriorityAction }) {
  const days = daysUntil(action.dueDate);
  const urgent = days <= 3 && days >= 0;
  const overdue = days < 0;

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
      overdue ? 'border-red-300' : urgent ? 'border-orange-300' : 'border-gray-200'
    }`}>
      <div className="flex">
        {/* Rank indicator */}
        <div className={`w-1.5 shrink-0 ${RANK_COLORS[action.rank - 1] ?? 'bg-gray-400'}`} />
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${RANK_COLORS[action.rank - 1] ?? 'bg-gray-400'}`}>
                {action.rank}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{action.title}</h3>
                <p className="text-sm text-gray-600 mt-0.5">{action.description}</p>
              </div>
            </div>
            <span className={`badge ${STATUS_BADGE[action.status]} shrink-0`}>
              {action.status.replace('_', ' ')}
            </span>
          </div>

          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <User size={13} className="text-gray-400" />
              <span className="font-medium">{action.owner}</span>
            </div>
            <div className={`flex items-center gap-1.5 text-sm ${
              overdue ? 'text-red-600' : urgent ? 'text-orange-600' : 'text-gray-600'
            }`}>
              <Calendar size={13} className={overdue ? 'text-red-500' : urgent ? 'text-orange-500' : 'text-gray-400'} />
              <span>
                {formatDate(action.dueDate)}
                {overdue && ' · OVERDUE'}
                {urgent && !overdue && ` · ${days}d left`}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <AlertCircle size={13} className="text-gray-400" />
              <span>Affects: {action.dealAffected}</span>
            </div>
          </div>

          {action.rationale && (
            <div className="mt-3 bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500 font-medium mb-0.5">Rationale</p>
              <p className="text-xs text-gray-700">{action.rationale}</p>
            </div>
          )}

          {action.sources.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {action.sources.map(src => (
                <span key={src.id} className="font-mono text-xs bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded text-blue-700">
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
