'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  RefreshCw, TrendingUp, Users, AlertTriangle, Target,
  CheckCircle, Clock, Building2, Shield, Zap, FileText,
  AlertCircle, ChevronRight,
} from 'lucide-react';
import type { Account } from '@/types/crm';
import { formatCurrency, formatDate } from '@/lib/utils';

// Tools to sync in order — each needs 62s gap due to MCP rate limit
const SYNC_TOOLS = [
  'whoami',
  'get_my_accounts',
  'get_all_paperwork',
  'get_signals',
  'get_flytbase_team',
  'list_notes',
];

type SyncStatus = 'idle' | 'running' | 'done' | 'error';
interface ToolResult { tool: string; status: 'ok' | 'cached' | 'error'; msg?: string }

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncProgress, setSyncProgress] = useState<ToolResult[]>([]);
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [tokenError, setTokenError] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncRef = useRef(false);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const res = await fetch('/api/accounts');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAccounts(data.accounts ?? []);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const startCountdown = (seconds: number): Promise<void> =>
    new Promise(resolve => {
      setCountdown(seconds);
      let left = seconds;
      countdownRef.current = setInterval(() => {
        left -= 1;
        setCountdown(left);
        if (left <= 0) {
          clearInterval(countdownRef.current!);
          setCountdown(0);
          resolve();
        }
      }, 1000);
    });

  const triggerSync = async () => {
    if (syncRef.current) return;
    syncRef.current = true;
    setSyncStatus('running');
    setSyncProgress([]);
    setTokenError(false);

    for (let i = 0; i < SYNC_TOOLS.length; i++) {
      const tool = SYNC_TOOLS[i];
      setCurrentTool(tool);

      try {
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool }),
        });
        const data = await res.json();

        if (data.isTokenError) {
          setTokenError(true);
          setSyncProgress(p => [...p, { tool, status: 'error', msg: 'AQ_TOKEN not set in Vercel env vars' }]);
          setSyncStatus('error');
          syncRef.current = false;
          return;
        }
        if (data.error) throw new Error(data.error);

        setSyncProgress(p => [
          ...p,
          { tool, status: data.fromCache ? 'cached' : 'ok' },
        ]);

        // Wait 62s before next call (unless it was cached or last item)
        if (!data.fromCache && i < SYNC_TOOLS.length - 1) {
          await startCountdown(62);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setSyncProgress(p => [...p, { tool, status: 'error', msg }]);
        // Continue to next tool even if one fails
      }
    }

    setCurrentTool(null);
    setSyncStatus('done');
    syncRef.current = false;
    await fetchAccounts();
  };

  const totalVerified = accounts.reduce((s, a) => s + a.bookWorth.totalVerified, 0);
  const totalEstimated = accounts.reduce((s, a) => s + a.bookWorth.totalEstimated, 0);
  const totalRisks = accounts.reduce((s, a) => s + a.riskRadar.risks.length, 0);
  const criticalRisks = accounts.reduce((s, a) => s + a.riskRadar.risks.filter(r => r.severity === 'critical').length, 0);
  const openActions = accounts.reduce((s, a) => s + a.priorityActions.actions.filter(ac => ac.status === 'open').length, 0);
  const totalGaps = accounts.reduce((s, a) => s + a.intelGaps.gaps.length, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Portfolio Overview</h1>
            <p className="text-sm text-gray-500 mt-0.5">FlytBase Customer Success · {accounts.length} Accounts</p>
          </div>
          <div className="flex items-center gap-3">
            {syncStatus === 'done' && (
              <span className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg">
                ✅ Sync complete
              </span>
            )}
            <button
              onClick={triggerSync}
              disabled={syncStatus === 'running'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              <RefreshCw size={15} className={syncStatus === 'running' ? 'animate-spin' : ''} />
              {syncStatus === 'running' ? 'Syncing…' : 'Sync MCP Data'}
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">
        {/* Token error banner */}
        {tokenError && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-5 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">AQ_TOKEN not configured</p>
              <p className="text-sm text-red-700 mt-1">
                Go to your <strong>Vercel project → Settings → Environment Variables</strong> and add:
              </p>
              <code className="block mt-2 bg-red-100 px-3 py-2 rounded text-sm text-red-900 font-mono">
                AQ_TOKEN = your_questathon_token_here
              </code>
              <p className="text-xs text-red-500 mt-2">Then redeploy for the change to take effect.</p>
            </div>
          </div>
        )}

        {/* Sync progress panel */}
        {syncStatus === 'running' && (
          <div className="bg-white border border-blue-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw size={16} className="text-blue-600 animate-spin" />
              <h3 className="font-semibold text-gray-900">Syncing MCP Data</h3>
              <span className="text-xs text-gray-500 ml-auto">
                MCP rate limit: 1 call/min
              </span>
            </div>
            <div className="space-y-2">
              {SYNC_TOOLS.map((tool) => {
                const result = syncProgress.find(p => p.tool === tool);
                const isActive = currentTool === tool;
                return (
                  <div key={tool} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                    result?.status === 'ok' ? 'bg-emerald-50' :
                    result?.status === 'cached' ? 'bg-blue-50' :
                    result?.status === 'error' ? 'bg-red-50' :
                    isActive ? 'bg-amber-50' : 'bg-gray-50'
                  }`}>
                    <span className="font-mono text-xs text-gray-500 w-36 shrink-0">{tool}</span>
                    {result?.status === 'ok' && <span className="text-emerald-700">✅ Fetched</span>}
                    {result?.status === 'cached' && <span className="text-blue-700">⚡ From cache</span>}
                    {result?.status === 'error' && <span className="text-red-700">❌ {result.msg}</span>}
                    {isActive && !result && (
                      <span className="text-amber-700 flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                        Calling…
                      </span>
                    )}
                    {!result && !isActive && <span className="text-gray-400">Waiting…</span>}
                  </div>
                );
              })}
            </div>
            {countdown > 0 && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg">
                  <Clock size={14} className="text-amber-600" />
                  <span className="text-sm text-amber-800">
                    Rate limit — next call in <strong>{countdown}s</strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={<TrendingUp size={20} className="text-emerald-600" />} label="Verified ARR" value={formatCurrency(totalVerified)} sub="From signed contracts" color="emerald" />
          <KpiCard icon={<Target size={20} className="text-amber-600" />} label="Pipeline Value" value={formatCurrency(totalEstimated)} sub="Proposals & quotes" color="amber" />
          <KpiCard icon={<AlertTriangle size={20} className="text-red-500" />} label="Open Risks" value={String(totalRisks)} sub={`${criticalRisks} critical`} color="red" />
          <KpiCard icon={<Zap size={20} className="text-blue-600" />} label="Open Actions" value={String(openActions)} sub={`${totalGaps} intel gaps`} color="blue" />
        </div>

        {fetchError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            ⚠️ {fetchError}
          </div>
        )}

        {/* Account Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 h-72 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {accounts.map(account => <AccountCard key={account.id} account={account} />)}
          </div>
        )}

        {/* Sync hint */}
        {!loading && accounts.some(a => !a.rawDataFetched) && syncStatus === 'idle' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Clock size={18} className="text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-800">MCP data not loaded yet</p>
              <p className="text-xs text-blue-600 mt-1">
                Click <strong>Sync MCP Data</strong> above. The app will fetch each of the 6 MCP tools one at a time,
                waiting 62s between calls to respect the rate limit. Total time: ~6 minutes. Results are cached.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AccountCard({ account }: { account: Account }) {
  const critRisks = account.riskRadar.risks.filter(r => r.severity === 'critical').length;
  const topAction = account.priorityActions.actions.find(a => a.rank === 1);
  return (
    <Link href={`/accounts/${account.id}`}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {account.industry === 'Public Safety' ? <Shield size={16} className="text-blue-300" /> : <Building2 size={16} className="text-blue-300" />}
                <span className="text-xs text-slate-400 uppercase tracking-wide font-medium">{account.industry}</span>
              </div>
              <h2 className="text-lg font-bold text-white leading-tight">{account.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{account.segment}</p>
            </div>
            <div>
              {account.rawDataFetched
                ? <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full"><CheckCircle size={10} /> Live</span>
                : <span className="inline-flex items-center gap-1 text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full"><Clock size={10} /> No data</span>}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Verified</p>
              <p className="text-sm font-bold text-emerald-700">{formatCurrency(account.bookWorth.totalVerified, account.bookWorth.currency)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Estimated</p>
              <p className="text-sm font-bold text-amber-600">{formatCurrency(account.bookWorth.totalEstimated, account.bookWorth.currency)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Unverified</p>
              <p className="text-sm font-bold text-gray-500">{formatCurrency(account.bookWorth.totalUnverified, account.bookWorth.currency)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className={critRisks > 0 ? 'text-red-500' : 'text-gray-400'} />
              <span className="text-xs text-gray-600">{account.riskRadar.risks.length === 0 ? 'No risks detected' : `${critRisks} critical`}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={14} className="text-gray-400" />
              <span className="text-xs text-gray-600">{account.powerMap.stakeholders.length} stakeholders</span>
            </div>
          </div>
          {topAction && (
            <div className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
              <p className="text-xs font-semibold text-blue-700 mb-0.5">Priority #1</p>
              <p className="text-xs text-blue-800 leading-snug">{topAction.title}</p>
              <p className="text-xs text-blue-500 mt-0.5">Due: {topAction.dueDate} · {topAction.owner}</p>
            </div>
          )}
          {account.intelGaps.gaps.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <FileText size={13} />
              <span>{account.intelGaps.gaps.length} intel gap{account.intelGaps.gaps.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
          <span className="text-xs text-blue-600 font-medium flex items-center gap-1">View full account <ChevronRight size={12} /></span>
        </div>
      </div>
    </Link>
  );
}

function KpiCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  const bg: Record<string, string> = { emerald: 'bg-emerald-50', amber: 'bg-amber-50', red: 'bg-red-50', blue: 'bg-blue-50' };
  return (
    <div className={`${bg[color]} rounded-xl border border-gray-200 px-5 py-4`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-gray-600 font-medium">{label}</span></div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
    </div>
  );
}
