"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchAlerts, fetchAlertSummary, acknowledgeAlert, NewsAlert, AlertSummary } from '@/lib/api';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { 
  Bell, CheckCircle, AlertTriangle, AlertOctagon, Eye, Filter, 
  Search, CalendarDays, X, Shield, Briefcase, TrendingUp, Cpu, Wifi, Globe,
  ExternalLink, Newspaper  // ← NEW icons
} from 'lucide-react';

// ── Icons & Meta ─────────────────────────────────────────────────────────────

const HelpIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  strategic:    { label: 'Strategic',    color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/20',       icon: <Shield    className="w-3.5 h-3.5" /> },
  governance:   { label: 'Governance',   color: 'text-slate-400',  bg: 'bg-slate-400/10 border-slate-400/20',   icon: <Briefcase className="w-3.5 h-3.5" /> },
  financial:    { label: 'Financial',    color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', icon: <TrendingUp className="w-3.5 h-3.5" /> },
  technology:   { label: 'Technology',   color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/20',     icon: <Cpu        className="w-3.5 h-3.5" /> },
  operational:  { label: 'Operational',  color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20', icon: <Wifi       className="w-3.5 h-3.5" /> },
  external:     { label: 'External',     color: 'text-pink-400',   bg: 'bg-pink-400/10 border-pink-400/20',     icon: <Globe      className="w-3.5 h-3.5" /> },
  other:        { label: 'Other',        color: 'text-gray-400',   bg: 'bg-gray-400/10 border-gray-400/20',     icon: <HelpIcon   className="w-3.5 h-3.5" /> },
};

const CATEGORIES = ['strategic', 'governance', 'financial', 'technology', 'operational', 'external', 'other'];

const SUBCATEGORIES: Record<string, string[]> = {
  strategic: ["Strategic & Execution", "Regulatory & Stakeholders", "Products and Innovation", "M&A, Divestitures and Strategic Partnerships"],
  governance: ["Compliance", "Internal Control Environment", "Fraud and Financial Crime", "Governance", "Social and Ethics"],
  financial: ["Financial Markets", "Liquidity and Funding", "Tax", "Financial Accounting and Reporting", "Credit Risk", "Financial Performance & Returns"],
  technology: ["Network", "Information Technology", "Information Security"],
  operational: ["Supply Chain", "Sales and Distribution", "Customer Experience", "Continuity Risk", "Human Capital", "Environment", "Reputation, Branding and Marketing"],
  external: ["Competition", "Legal", "Political and Macroeconomy"],
  other: ["Other"]
};

const TIER_META: Record<string, { bar: string; badge: string; bg: string; icon: React.ReactNode }> = {
  Critical: { bar: 'bg-red-500',    badge: 'text-red-400 border-red-400/30 bg-red-400/10',       bg: 'border-red-500/20',    icon: <AlertOctagon className="w-4 h-4 text-red-400" /> },
  Warning:  { bar: 'bg-orange-400', badge: 'text-orange-400 border-orange-400/30 bg-orange-400/10', bg: 'border-orange-400/20', icon: <AlertTriangle className="w-4 h-4 text-orange-400" /> },
  Watch:    { bar: 'bg-yellow-400', badge: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10', bg: 'border-yellow-400/20', icon: <Eye className="w-4 h-4 text-yellow-400" /> },
};

const TIER_FILTERS = ['All', 'Critical', 'Warning', 'Watch'];
const EMPTY_FILTERS = { keyword: '', dateFrom: '', dateTo: '' };

// ── Formatters ───────────────────────────────────────────────────────────────

function fmtGhs(v: number | null): string {
  if (v == null) return '—';
  return `GHS ${v.toFixed(1)}m`;
}

function cleanSubcategory(subcat: string | null | undefined): string {
  if (!subcat) return '';
  return subcat.replace(/^\d+\s*-\s*/, '').trim();
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
}

function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' / ');
}

// ── Components ───────────────────────────────────────────────────────────────

function SummaryRow({ summary }: { summary: AlertSummary }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[
        { label: 'Active Alerts', value: summary.total_active, color: 'text-on-surface' },
        { label: 'Critical',      value: summary.critical,     color: 'text-red-400' },
        { label: 'Warning',       value: summary.warning,      color: 'text-orange-400' },
        { label: 'Watch',         value: summary.watch,        color: 'text-yellow-400' },
      ].map(({ label, value, color }) => (
        <div key={label} className="rounded-xl border p-4" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-mono uppercase tracking-widest text-on-surface-variant mb-1">{label}</p>
          <p className={`text-2xl font-hero font-bold ${color}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}

// function AlertCard({ alert, onAcknowledge, ackLoading }: { alert: NewsAlert & { subcategory?: string | null }; onAcknowledge: (id: string) => void; ackLoading: boolean; }) {
//   const meta = (TIER_META[alert.tier] ?? TIER_META['Watch'])!;
//   const cleanedSubcat = cleanSubcategory(alert.subcategory);

//   return (
//     <div className={`relative rounded-xl border overflow-hidden transition-all duration-200 ${alert.acknowledged ? 'opacity-50' : ''} ${meta.bg}`} style={{ background: 'rgba(255,255,255,0.02)' }}>
//       <div className={`absolute left-0 top-0 bottom-0 w-1 ${meta.bar}`} />
//       <div className="pl-4 pr-4 py-4 flex items-start gap-4">
//         <div className="shrink-0 mt-0.5">{meta.icon}</div>
//         <div className="flex-1 min-w-0 space-y-1.5">
//           <p className="text-sm font-semibold text-on-surface leading-snug">{alert.headline}</p>
//           <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant font-mono">
//             <span className={`px-2 py-0.5 rounded-full border font-bold ${meta?.badge ?? ''}`}>{alert.tier}</span>
//             <span className="px-2 py-0.5 rounded-full border border-white/10 bg-white/5">{capitalize(alert.category)}</span>
//             {cleanedSubcat && cleanedSubcat.toLowerCase() !== 'other' && (
//               <span className="px-2 py-0.5 rounded-full border border-white/5 bg-white/5 text-[10px]">{cleanedSubcat}</span>
//             )}
//             {alert.sourceName && <span>{alert.sourceName}</span>}
//             <span>·</span>
//             <span>{fmtDate(alert.createdAt)}</span>
//           </div>
//           <div className="flex flex-wrap gap-4 text-xs font-mono pt-1">
//             <span className="text-on-surface-variant">Severity: <span className="text-on-surface font-bold">{alert.severity.toFixed(1)}/10</span></span>
//             <span className="text-on-surface-variant">MTN Relevance: <span className="text-on-surface font-bold">{alert.mtnRelevance != null ? `${(alert.mtnRelevance * 100).toFixed(0)}%` : '—'}</span></span>
//             <span className="text-on-surface-variant">Impact: <span className="text-mtn-yellow font-bold">{fmtGhs(alert.impactGhsMid)}</span></span>
//           </div>
//           {alert.acknowledged && alert.acknowledgedAt && (
//             <p className="text-xs text-on-surface-variant italic">Acknowledged {fmtDate(alert.acknowledgedAt)}</p>
//           )}
//         </div>
//         {!alert.acknowledged && (
//           <button
//             onClick={() => onAcknowledge(alert.id)}
//             disabled={ackLoading}
//             className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all duration-150 disabled:opacity-40 hover:border-green-400/40 hover:text-green-400"
//             style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(240,237,232,0.5)' }}
//           >
//             <CheckCircle className="w-3.5 h-3.5" /> Ack
//           </button>
//         )}
//       </div>
//     </div>
//   );
// }

function AlertCard({ alert, onAcknowledge, ackLoading }: { alert: NewsAlert & { subcategory?: string | null; articleUrl?: string | null }; onAcknowledge: (id: string) => void; ackLoading: boolean; }) {
  const meta = (TIER_META[alert.tier] ?? TIER_META['Watch'])!;
  const cleanedSubcat = cleanSubcategory(alert.subcategory);

  return (
    <div className={`relative rounded-xl border overflow-hidden transition-all duration-200 ${alert.acknowledged ? 'opacity-50' : ''} ${meta.bg}`} style={{ background: 'rgba(255,255,255,0.02)' }}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${meta.bar}`} />
      <div className="pl-4 pr-4 py-4 flex items-start gap-4">
        <div className="shrink-0 mt-0.5">{meta.icon}</div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-sm font-semibold text-on-surface leading-snug">{alert.headline}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant font-mono">
            <span className={`px-2 py-0.5 rounded-full border font-bold ${meta?.badge ?? ''}`}>{alert.tier}</span>
            <span className="px-2 py-0.5 rounded-full border border-white/10 bg-white/5">{capitalize(alert.category)}</span>
            {cleanedSubcat && cleanedSubcat.toLowerCase() !== 'other' && (
              <span className="px-2 py-0.5 rounded-full border border-white/5 bg-white/5 text-[10px]">{cleanedSubcat}</span>
            )}
            {alert.sourceName && <span>{alert.sourceName}</span>}
            <span>·</span>
            <span>{fmtDate(alert.createdAt)}</span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-mono pt-1">
            <span className="text-on-surface-variant">Severity: <span className="text-on-surface font-bold">{alert.severity.toFixed(1)}/10</span></span>
            <span className="text-on-surface-variant">MTN Relevance: <span className="text-on-surface font-bold">{alert.mtnRelevance != null ? `${(alert.mtnRelevance * 100).toFixed(0)}%` : '—'}</span></span>
            <span className="text-on-surface-variant">Impact: <span className="text-mtn-yellow font-bold">{fmtGhs(alert.impactGhsMid)}</span></span>
          </div>

          {/* ── NEW: Article Link Row ── */}
          <div className="flex items-center gap-2 pt-2">
            {alert.articleUrl ? (
              <a
                href={alert.articleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all hover:bg-mtn-yellow/10 hover:border-mtn-yellow/40 hover:text-mtn-yellow"
                style={{ borderColor: 'rgba(255,208,0,0.25)', color: '#FFD000' }}
              >
                <ExternalLink className="w-3 h-3" />
                Read Article
              </a>
            ) : (
              <a
                href={`/news?article=${alert.articleId}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono border border-white/10 text-on-surface-variant hover:text-on-surface hover:border-white/20 transition-all"
              >
                <Newspaper className="w-3 h-3" />
                View in News Feed
              </a>
            )}
          </div>

          {alert.acknowledged && alert.acknowledgedAt && (
            <p className="text-xs text-on-surface-variant italic">Acknowledged {fmtDate(alert.acknowledgedAt)}</p>
          )}
        </div>
        {!alert.acknowledged && (
          <button
            onClick={() => onAcknowledge(alert.id)}
            disabled={ackLoading}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all duration-150 disabled:opacity-40 hover:border-green-400/40 hover:text-green-400"
            style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(240,237,232,0.5)' }}
          >
            <CheckCircle className="w-3.5 h-3.5" /> Ack
          </button>
        )}
      </div>
    </div>
  );
}


// ── Main Page ────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const [alerts, setAlerts]       = useState<NewsAlert[]>([]);
  const [summary, setSummary]     = useState<AlertSummary | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  
  // API Filters
  const [tierFilter, setTierFilter] = useState<string>('All');
  const [showAcked, setShowAcked]   = useState(false);
  const [ackIds, setAckIds]         = useState<Set<string>>(new Set());

  // Client-Side Filters (Search, Dates, Category, Subcategory)
  const [keyword, setKeyword]               = useState('');
  const [dateFrom, setDateFrom]             = useState('');
  const [dateTo, setDateTo]                 = useState('');
  const [filters, setFilters]               = useState(EMPTY_FILTERS);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);

  const loadData = useCallback(async (tier: string, showAck: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const [alts, sum] = await Promise.all([
        fetchAlerts({
          tier: tier === 'All' ? undefined : tier,
          acknowledged: showAck ? undefined : false,
          limit: 200, // Increased limit so client-side filtering has enough data
        }),
        fetchAlertSummary(),
      ]);
      setAlerts(alts);
      setSummary(sum);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(tierFilter, showAcked);
  }, [loadData, tierFilter, showAcked]);

  async function handleAcknowledge(alertId: string) {
    setAckIds(prev => new Set(prev).add(alertId));
    try {
      await acknowledgeAlert(alertId);
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true, acknowledgedAt: new Date().toISOString() } : a));
      setSummary(prev => prev ? { ...prev, total_active: Math.max(0, prev.total_active - 1) } : prev);
    } catch (e) {
      alert(`Failed to acknowledge: ${e}`);
    } finally {
      setAckIds(prev => { const next = new Set(prev); next.delete(alertId); return next; });
    }
  }

  function applySearch() {
    setFilters({ keyword: keyword.trim(), dateFrom, dateTo });
  }

  function clearSearch() {
    setKeyword(''); setDateFrom(''); setDateTo('');
    setFilters(EMPTY_FILTERS);
  }

  const filteredAndSortedAlerts = useMemo(() => {
    let result = alerts;

    // Client Category Filter
    if (activeCategory) {
      result = result.filter(a => a.category?.toLowerCase() === activeCategory.toLowerCase());
    }
    
    // Client Subcategory Filter
    if (activeSubcategory) {
      result = result.filter(a => cleanSubcategory(a.subcategory).toLowerCase() === activeSubcategory.toLowerCase());
    }

    // Client Keyword Filter
    if (filters.keyword) {
      const k = filters.keyword.toLowerCase();
      result = result.filter(a => a.headline?.toLowerCase().includes(k) || a.sourceName?.toLowerCase().includes(k));
    }

    // Client Date Filters
    if (filters.dateFrom) {
      const fromMs = new Date(filters.dateFrom).getTime();
      result = result.filter(a => new Date(a.createdAt || 0).getTime() >= fromMs);
    }
    if (filters.dateTo) {
      const toMs = new Date(filters.dateTo).getTime() + 86399999; // End of day
      result = result.filter(a => new Date(a.createdAt || 0).getTime() <= toMs);
    }

    return result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [alerts, activeCategory, activeSubcategory, filters]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-400/10 border border-red-400/20 flex items-center justify-center">
          <Bell className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-3xl font-hero font-bold text-on-surface">Risk Alerts</h1>
          <p className="text-on-surface-variant mt-0.5">AI-generated alerts from live news — Watch · Warning · Critical</p>
        </div>
      </div>

      {summary && <SummaryRow summary={summary} />}

      {/* ── Search and Date Filters ── */}
      <div className="rounded-xl border border-white/7 bg-white/[0.02] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="flex-1 space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">Keyword or source</span>
            <span className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 focus-within:border-mtn-yellow/40">
              <Search className="h-4 w-4 shrink-0 text-on-surface-variant" />
              <input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') applySearch(); }}
                placeholder="e.g. Cedi, NCA, Tax..."
                className="w-full bg-transparent py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50"
              />
            </span>
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">From date</span>
            <span className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 focus-within:border-mtn-yellow/40">
              <CalendarDays className="h-4 w-4 text-on-surface-variant" />
              <input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)} className="bg-transparent py-2.5 text-xs text-on-surface [color-scheme:dark]" />
            </span>
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">To date</span>
            <span className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 focus-within:border-mtn-yellow/40">
              <CalendarDays className="h-4 w-4 text-on-surface-variant" />
              <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)} className="bg-transparent py-2.5 text-xs text-on-surface [color-scheme:dark]" />
            </span>
          </label>
          <div className="flex gap-2">
            <button onClick={applySearch} className="flex items-center gap-2 rounded-lg bg-mtn-yellow px-4 py-2.5 text-xs font-bold text-black transition hover:bg-mtn-yellow-bright"><Search className="h-3.5 w-3.5" /> Search</button>
            {(filters.keyword || filters.dateFrom || filters.dateTo) && <button onClick={clearSearch} title="Clear filters" className="rounded-lg border border-white/10 px-3 py-2.5 text-on-surface-variant transition hover:text-on-surface"><X className="h-4 w-4" /></button>}
          </div>
        </div>
      </div>

      {/* ── Layer 1: High-Level Categories ── */}
      <div className="space-y-2 animate-in fade-in duration-200">
        <p className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">Risk Categories (Layer 1)</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setActiveCategory(null); setActiveSubcategory(null); }}
            className={`px-3 py-1.5 rounded-full text-xs font-mono border transition-all ${
              activeCategory == null ? 'bg-mtn-yellow/15 border-mtn-yellow/30 text-mtn-yellow' : 'border-white/10 text-on-surface-variant hover:border-white/20'
            }`}
          >
            All Categories
          </button>
          {CATEGORIES.map(cat => {
            const meta = CATEGORY_META[cat]!;
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setActiveSubcategory(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono border transition-all ${
                  isActive ? `${meta.bg} ${meta.color}` : 'border-white/10 text-on-surface-variant hover:border-white/20'
                }`}
              >
                {meta.icon} {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Layer 2: Subcategories ── */}
      {activeCategory && SUBCATEGORIES[activeCategory] && (
        <div className="space-y-2 p-3 rounded-xl bg-white/[0.01] border border-white/5 animate-in slide-in-from-top-1 duration-250">
          <p className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
            Subcategories under {CATEGORY_META[activeCategory]?.label} (Layer 2)
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveSubcategory(null)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono border transition-all ${
                activeSubcategory == null ? 'bg-white/10 border-white/25 text-on-surface' : 'border-white/5 text-on-surface-variant/70 hover:border-white/10 hover:text-on-surface'
              }`}
            >
              All Subcategories
            </button>
            {SUBCATEGORIES[activeCategory].map(sub => (
              <button
                key={sub}
                onClick={() => setActiveSubcategory(sub)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-mono border transition-all ${
                  activeSubcategory === sub ? 'bg-mtn-yellow/15 border-mtn-yellow/25 text-mtn-yellow' : 'border-white/5 text-on-surface-variant/70 hover:border-white/10 hover:text-on-surface'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Backend State Filters (Tier & Acked) ── */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10">
        <div className="flex items-center gap-1.5 text-xs font-mono text-on-surface-variant">
          <Filter className="w-3.5 h-3.5" /> Tier:
        </div>
        {TIER_FILTERS.map(t => (
          <button
            key={t}
            onClick={() => setTierFilter(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-mono border transition-all ${
              tierFilter === t ? 'bg-mtn-yellow/15 border-mtn-yellow/30 text-mtn-yellow' : 'border-white/10 text-on-surface-variant hover:border-white/20'
            }`}
          >
            {t}
          </button>
        ))}
        <div className="ml-auto">
          <button
            onClick={() => setShowAcked(v => !v)}
            className={`px-3 py-1.5 rounded-full text-xs font-mono border transition-all flex items-center gap-1.5 ${
              showAcked ? 'bg-green-400/10 border-green-400/20 text-green-400' : 'border-white/10 text-on-surface-variant hover:border-white/20'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {showAcked ? 'Hiding acknowledged' : 'Show acknowledged'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl border border-red-400/20 bg-red-400/05 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Alert Cards ── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonBlock key={i} className="h-24" />)}
        </div>
      ) : filteredAndSortedAlerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant gap-3">
          <Bell className="w-10 h-10 opacity-30" />
          <p className="text-sm">No alerts match your current filters.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAndSortedAlerts.map(a => (
            <AlertCard
              key={a.id}
              alert={a}
              onAcknowledge={handleAcknowledge}
              ackLoading={ackIds.has(a.id)}
            />
          ))}
          <p className="text-center pt-4 text-xs font-mono text-on-surface-variant">
            Showing {filteredAndSortedAlerts.length} alert{filteredAndSortedAlerts.length === 1 ? '' : 's'}
          </p>
        </div>
      )}
    </div>
  );
}