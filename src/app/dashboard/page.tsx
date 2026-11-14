'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  RefreshCw, TrendingUp, Users, AlertTriangle, Target,
  CheckCircle, Clock, Building2, Shield, Zap, FileText,
} from 'lucide-react';
import type { Account } from '@/types/crm';
import { formatCurrency, formatDate, getHealthColor, getSeverityBadge } from '@/lib/utils';

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/accounts');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAccounts(data.accounts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const triggerSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tools: ['whoami', 'get_my_accounts', 'get_all_paperwork', 'get_signals', 'get_flytbase_team', 'list_notes'] }),
      });
      const data = await res.json();
      const failed = Object.entries(data.results ?? {})
        .filter(([, v]) => (v as { error?: string }).error)
        .map(([k, v]) => `${k}: ${(v as { error?: string }).error}`);
      if (failed.length > 0) {
        setSyncResult(`Sync completed with errors:\n${failed.join('\n')}`);
      } else {
        setSyncResult('Sync completed successfully. Data loaded from MCP.');
      }
      await fetchAccounts();
    } catch (e) {
      setSyncResult(`Sync failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSyncing(false);
    }
  };

  const totalVerified = accounts.reduce((s, a) => s + a.bookWorth.totalVerified, 0);
  const totalEstimated = accounts.reduce((s, a) => s + a.bookWorth.totalEstimated, 0);
  const totalRisks = accounts.reduce((s, a) => s + a.riskRadar.risks.length, 0);
  const criticalRisks = accounts.reduce(
    (s, a) => s + a.riskRadar.risks.filter(r => r.severity === 'critical').length,
    0,
  );
  const openActions = accounts.reduce(
    (s, a) => s + a.priorityActions.actions.filter(ac => ac.status === 'open').length,
    0,
  );
  const totalGaps = accounts.reduce((s, a) => s + a.intelGaps.gaps.length, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Portfolio Overview</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              FlytBase Customer Success · {accounts.length} Accounts
            </p>
          </div>
          <div className="flex items-center gap-3">
            {syncResult && (
              <span className={`text-xs px-3 py-1.5 rounded-lg max-w-xs truncate ${
                syncResult.includes('error') || syncResult.includes('failed')
                  ? 'bg-red-50 text-red-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}>
                {syncResult}
              </span>
            )}
            <button
              onClick={triggerSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing MCP…' : 'Sync MCP Data'}
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            icon={<TrendingUp size={20} className="text-emerald-600" />}
            label="Verified ARR"
            value={formatCurrency(totalVerified)}
            sub="From signed contracts"
            color="emerald"
          />
          <KpiCard
            icon={<Target size={20} className="text-amber-600" />}
            label="Pipeline Value"
            value={formatCurrency(totalEstimated)}
            sub="Proposals & quotes"
            color="amber"
          />
          <KpiCard
            icon={<AlertTriangle size={20} className="text-red-500" />}
            label="Open Risks"
            value={String(totalRisks)}
            sub={`${criticalRisks} critical`}
            color="red"
          />
          <KpiCard
            icon={<Zap size={20} className="text-blue-600" />}
            label="Open Actions"
            value={String(openActions)}
            sub={`${totalGaps} intel gaps`}
            color="blue"
          />
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Account Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 h-72 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {accounts.map(account => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        )}

        {/* Sync notice */}
        {!loading && accounts.some(a => !a.rawDataFetched) && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Clock size={18} className="text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800">MCP data not yet loaded</p>
              <p className="text-xs text-blue-600 mt-1">
                Click <strong>Sync MCP Data</strong> above to fetch live account data.
                Rate limit: 1 call/minute. Full sync takes ~6 minutes.
                Results are cached to disk — subsequent loads are instant.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Account Card ----
function AccountCard({ account }: { account: Account }) {
  const critRisks = account.riskRadar.risks.filter(r => r.severity === 'critical').length;
  const highRisks = account.riskRadar.risks.filter(r => r.severity === 'high').length;
  const topAction = account.priorityActions.actions.find(a => a.rank === 1);

  return (
    <Link href={`/accounts/${account.id}`}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer overflow-hidden">
        {/* Account header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {account.industry === 'Public Safety' ? (
                  <Shield size={16} className="text-blue-300" />
                ) : (
                  <Building2 size={16} className="text-blue-300" />
                )}
                <span className="text-xs text-slate-400 uppercase tracking-wide font-medium">
                  {account.industry}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white leading-tight">{account.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{account.segment} · {account.id}</p>
            </div>
            <div className="text-right">
              {account.rawDataFetched ? (
                <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full">
                  <CheckCircle size={10} /> Live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full">
                  <Clock size={10} /> No data
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Book worth */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Verified</p>
              <p className="text-sm font-bold text-emerald-700">
                {formatCurrency(account.bookWorth.totalVerified, account.bookWorth.currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Estimated</p>
              <p className="text-sm font-bold text-amber-600">
                {formatCurrency(account.bookWorth.totalEstimated, account.bookWorth.currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Unverified</p>
              <p className="text-sm font-bold text-gray-500">
                {formatCurrency(account.bookWorth.totalUnverified, account.bookWorth.currency)}
              </p>
            </div>
          </div>

          {/* Risk summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className={critRisks > 0 ? 'text-red-500' : 'text-gray-400'} />
              <span className="text-xs text-gray-600">
                {account.riskRadar.risks.length === 0 ? 'No risks detected' : `${critRisks} critical · ${highRisks} high`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={14} className="text-gray-400" />
              <span className="text-xs text-gray-600">
                {account.powerMap.stakeholders.length} stakeholders
              </span>
            </div>
          </div>

          {/* Top action */}
          {topAction && (
            <div className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
              <p className="text-xs font-semibold text-blue-700 mb-0.5">Priority #1</p>
              <p className="text-xs text-blue-800 leading-snug">{topAction.title}</p>
              <p className="text-xs text-blue-500 mt-0.5">Due: {topAction.dueDate} · {topAction.owner}</p>
            </div>
          )}

          {/* Intel gaps */}
          {account.intelGaps.gaps.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <FileText size={13} />
              <span>{account.intelGaps.gaps.length} intelligence gap{account.intelGaps.gaps.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
          <span className="text-xs text-blue-600 font-medium">View full account →</span>
        </div>
      </div>
    </Link>
  );
}

// ---- KPI Card ----
function KpiCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: 'emerald' | 'amber' | 'red' | 'blue';
}) {
  const bg = { emerald: 'bg-emerald-50', amber: 'bg-amber-50', red: 'bg-red-50', blue: 'bg-blue-50' }[color];
  return (
    <div className={`${bg} rounded-xl border border-gray-200 px-5 py-4`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-gray-600 font-medium">{label}</span></div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
    </div>
  );
}
