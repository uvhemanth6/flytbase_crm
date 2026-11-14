'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, notFound } from 'next/navigation';
import { RefreshCw, ChevronLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import type { Account } from '@/types/crm';
import BookWorthPanel from '@/components/BookWorth';
import PowerMapPanel from '@/components/PowerMap';
import PriorityActionsPanel from '@/components/PriorityActions';
import RiskRadarPanel from '@/components/RiskRadar';
import IntelGapsPanel from '@/components/IntelGaps';
import NotesPanel from '@/components/NotesPanel';
import { formatDate } from '@/lib/utils';

type Tab = 'book' | 'power' | 'actions' | 'risks' | 'gaps' | 'notes';

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'book', label: 'Book Worth', emoji: '💰' },
  { id: 'power', label: 'Power Map', emoji: '👥' },
  { id: 'actions', label: 'Actions', emoji: '🎯' },
  { id: 'risks', label: 'Risk Radar', emoji: '⚠️' },
  { id: 'gaps', label: 'Intel Gaps', emoji: '🔍' },
  { id: 'notes', label: 'Notes', emoji: '📝' },
];

export default function AccountPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('book');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAccount = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/accounts');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const found = (data.accounts as Account[]).find(a => a.id === id);
      if (!found) {
        setError('Account not found');
      } else {
        setAccount(found);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadAccount(); }, [loadAccount]);

  // Sync tools one at a time (Vercel 10s timeout — no sleeping in server)
  const handleSync = async () => {
    setSyncing(true);
    const tools = ['get_all_paperwork', 'get_signals', 'list_notes', 'get_flytbase_team'];
    let errors: string[] = [];
    for (let i = 0; i < tools.length; i++) {
      setSyncMsg(`Fetching ${tools[i]} (${i + 1}/${tools.length})…`);
      try {
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: tools[i] }),
        });
        const data = await res.json();
        if (data.isTokenError) {
          setSyncMsg('❌ AQ_TOKEN not set — add it in Vercel Environment Variables');
          setSyncing(false);
          return;
        }
        if (data.error) errors.push(`${tools[i]}: ${data.error}`);
        // Wait 62s between calls unless from cache or last item
        if (!data.fromCache && i < tools.length - 1) {
          for (let s = 62; s > 0; s--) {
            setSyncMsg(`Rate limit — next call in ${s}s…`);
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      } catch (e) {
        errors.push(`${tools[i]}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    setSyncMsg(errors.length ? `Done with errors: ${errors.join('; ')}` : '✅ Sync complete');
    setSyncing(false);
    await loadAccount();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mb-3" />
          <p className="text-gray-500 text-sm">Loading account…</p>
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={40} className="text-red-400 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">{error ?? 'Account not found'}</p>
          <Link href="/dashboard" className="mt-4 inline-block text-blue-600 text-sm hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const critCount = account.riskRadar.risks.filter(r => r.severity === 'critical').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronLeft size={18} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{account.name}</h1>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-gray-500">{account.industry} · {account.segment}</span>
                {account.lastSyncSuccess && (
                  <span className="text-xs text-gray-400">
                    Last sync: {formatDate(account.lastSyncSuccess)}
                  </span>
                )}
                {!account.rawDataFetched && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    No MCP data — sync required
                  </span>
                )}
                {critCount > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle size={10} /> {critCount} critical risk{critCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {syncMsg && (
              <span className={`text-xs px-3 py-1.5 rounded-lg ${
                syncMsg.includes('error') || syncMsg.includes('Error')
                  ? 'bg-red-50 text-red-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}>
                {syncMsg}
              </span>
            )}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing…' : 'Sync'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-5 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Panel content */}
      <div className="px-8 py-6">
        {activeTab === 'book' && <BookWorthPanel bookWorth={account.bookWorth} accountName={account.name} />}
        {activeTab === 'power' && <PowerMapPanel powerMap={account.powerMap} accountName={account.name} />}
        {activeTab === 'actions' && <PriorityActionsPanel actions={account.priorityActions} accountName={account.name} />}
        {activeTab === 'risks' && <RiskRadarPanel riskRadar={account.riskRadar} accountName={account.name} />}
        {activeTab === 'gaps' && <IntelGapsPanel intelGaps={account.intelGaps} accountName={account.name} />}
        {activeTab === 'notes' && <NotesPanel notes={account.notes} accountId={account.id} accountName={account.name} />}
      </div>
    </div>
  );
}
