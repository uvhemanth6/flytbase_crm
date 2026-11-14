// Formatting utilities for the CRM UI

export function formatCurrency(amount: number, currency = 'GBP'): string {
  if (amount === 0) return '—';
  const symbols: Record<string, string> = { GBP: '£', USD: '$', EUR: '€' };
  const sym = symbols[currency] ?? currency + ' ';
  if (amount >= 1_000_000) return `${sym}${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `${sym}${(amount / 1_000).toFixed(1)}k`;
  return `${sym}${amount.toLocaleString()}`;
}

export function formatDate(iso: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function daysUntil(isoDate: string): number {
  if (!isoDate) return Infinity;
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return Infinity;
  return Math.round((d.getTime() - Date.now()) / 86_400_000);
}

export function getHealthColor(score?: number): string {
  if (score == null) return 'text-gray-400';
  if (score >= 70) return 'text-emerald-600';
  if (score >= 40) return 'text-amber-500';
  return 'text-red-500';
}

export function getSeverityBadge(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-red-100 text-red-800 border border-red-200';
    case 'high': return 'bg-orange-100 text-orange-800 border border-orange-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    default: return 'bg-blue-50 text-blue-700 border border-blue-200';
  }
}

export function getVerifBadge(status: string): string {
  switch (status) {
    case 'verified': return 'bg-emerald-100 text-emerald-800';
    case 'estimated': return 'bg-amber-100 text-amber-800';
    default: return 'bg-gray-100 text-gray-700';
  }
}

export function getRoleBadge(role: string): string {
  switch (role) {
    case 'decision_maker': return 'bg-purple-100 text-purple-800';
    case 'budget_owner': return 'bg-green-100 text-green-800';
    case 'signatory': return 'bg-blue-100 text-blue-800';
    case 'champion': return 'bg-emerald-100 text-emerald-800';
    case 'blocker': return 'bg-red-100 text-red-800';
    case 'influencer': return 'bg-indigo-100 text-indigo-800';
    default: return 'bg-gray-100 text-gray-700';
  }
}

export function getRelationshipColor(status: string): string {
  switch (status) {
    case 'strong': return 'text-emerald-600';
    case 'neutral': return 'text-gray-500';
    case 'at_risk': return 'text-orange-500';
    case 'cold': return 'text-red-500';
    default: return 'text-gray-400';
  }
}

export function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
