'use client';

import { TrendingUp, Info, ExternalLink } from 'lucide-react';
import type { BookWorth, DealValue } from '@/types/crm';
import { formatCurrency, formatDate, getVerifBadge } from '@/lib/utils';

interface Props {
  bookWorth: BookWorth;
  accountName: string;
}

export default function BookWorthPanel({ bookWorth, accountName }: Props) {
  const grand = bookWorth.totalVerified + bookWorth.totalEstimated + bookWorth.totalUnverified;

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp size={20} className="text-emerald-600" />
          What Is The Book Worth?
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Deal-level values with source IDs. Separated by verification status.
          Last updated: {formatDate(bookWorth.lastUpdated)}
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Book"
          value={formatCurrency(grand, bookWorth.currency)}
          sub="All verification levels"
          color="slate"
        />
        <SummaryCard
          label="✅ Verified"
          value={formatCurrency(bookWorth.totalVerified, bookWorth.currency)}
          sub="Signed contracts only"
          color="emerald"
        />
        <SummaryCard
          label="📊 Estimated"
          value={formatCurrency(bookWorth.totalEstimated, bookWorth.currency)}
          sub="Proposals & quotes"
          color="amber"
        />
        <SummaryCard
          label="❓ Unverified"
          value={formatCurrency(bookWorth.totalUnverified, bookWorth.currency)}
          sub="No source document"
          color="gray"
        />
      </div>

      {/* Verification key */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-wrap gap-6 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <strong>Verified:</strong> sourced from signed contracts
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
          <strong>Estimated:</strong> from proposals, quotes, or in negotiation
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400" />
          <strong>Unverified:</strong> referenced without a document source
        </span>
      </div>

      {/* Deal table */}
      {bookWorth.deals.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Deal Breakdown ({bookWorth.deals.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full crm-table">
              <thead>
                <tr>
                  <th>Deal Name</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th>Renewal</th>
                  <th>Source ID</th>
                  <th>Products</th>
                </tr>
              </thead>
              <tbody>
                {bookWorth.deals.map(deal => (
                  <DealRow key={deal.dealId} deal={deal} currency={bookWorth.currency} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          message="No deal data available from MCP yet."
          hint="Trigger a sync to load paperwork and contracts."
        />
      )}

      {/* Data gaps */}
      {bookWorth.dataGaps.length > 0 && (
        <DataGaps gaps={bookWorth.dataGaps} />
      )}
    </div>
  );
}

function DealRow({ deal, currency }: { deal: DealValue; currency: string }) {
  const src = deal.sources[0];
  return (
    <tr>
      <td>
        <p className="font-medium text-gray-900">{deal.dealName}</p>
        <p className="text-xs text-gray-400">{deal.dealId}</p>
      </td>
      <td>
        <span className="font-semibold text-gray-900">{formatCurrency(deal.value, currency)}</span>
      </td>
      <td>
        <span className={`badge ${getVerifBadge(deal.status)}`}>
          {deal.status}
        </span>
      </td>
      <td>
        {deal.renewalDate ? formatDate(deal.renewalDate) : <span className="text-gray-400 text-xs">Not set</span>}
      </td>
      <td>
        {src ? (
          <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded" title={src.label}>
            {src.id.length > 20 ? src.id.slice(0, 20) + '…' : src.id}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">No source</span>
        )}
      </td>
      <td>
        {deal.products && deal.products.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {deal.products.slice(0, 3).map(p => (
              <span key={p} className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">{p}</span>
            ))}
          </div>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        )}
      </td>
    </tr>
  );
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const bg: Record<string, string> = {
    slate: 'bg-slate-50 border-slate-200',
    emerald: 'bg-emerald-50 border-emerald-200',
    amber: 'bg-amber-50 border-amber-200',
    gray: 'bg-gray-50 border-gray-200',
  };
  const val: Record<string, string> = {
    slate: 'text-slate-900',
    emerald: 'text-emerald-800',
    amber: 'text-amber-800',
    gray: 'text-gray-600',
  };
  return (
    <div className={`rounded-xl border p-5 ${bg[color]}`}>
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className={`text-2xl font-bold ${val[color]}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

function DataGaps({ gaps }: { gaps: string[] }) {
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Info size={16} className="text-orange-600" />
        <h4 className="font-semibold text-orange-800">Data Gaps</h4>
      </div>
      <ul className="space-y-1.5">
        {gaps.map((gap, i) => (
          <li key={i} className="text-sm text-orange-700 flex items-start gap-2">
            <span className="mt-1 shrink-0">·</span> {gap}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
      <TrendingUp size={32} className="text-gray-300 mx-auto mb-3" />
      <p className="text-gray-600 font-medium">{message}</p>
      <p className="text-gray-400 text-sm mt-1">{hint}</p>
    </div>
  );
}
