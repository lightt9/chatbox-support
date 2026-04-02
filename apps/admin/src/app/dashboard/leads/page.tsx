'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Filter, X, Loader2, Check, ArrowLeft,
  Mail, Phone, ChevronDown, Trash2, Zap, Brain,
  MessageSquare, ExternalLink, TrendingUp, Sparkles,
  ArrowUpRight, Clock, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, ApiError } from '../../../lib/api';
import { Toast } from '../../../components/ui/Toast';
import { inputStylesSm } from '../../../components/ui/Input';

/* ── Types ──────────────────────────────────────────────────────────────────── */

interface Lead {
  id: string; displayId: string; name: string; email: string | null; phone: string | null;
  companyName: string | null; title: string | null; source: string; status: string;
  rating: string; assignedTo: string | null; notes: string | null; tags: string[];
  lostReason: string | null; convertedAt: string | null; lastContacted: string | null;
  conversationId: string | null; firstMessage: string | null; lastMessage: string | null;
  messageCount: number; customFields: Record<string, string>;
  intent: string | null; score: number; aiSummary: string | null;
  createdAt: string; updatedAt: string;
}

interface LeadsResponse { leads: Lead[]; counts: Record<string, number>; total: number }

/* ── Constants ──────────────────────────────────────────────────────────────── */

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];

const statusCfg: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  new:       { label: 'New',       color: 'text-blue-700',    bg: 'bg-blue-50',    dot: 'bg-blue-500' },
  contacted: { label: 'Engaged',   color: 'text-amber-700',   bg: 'bg-amber-50',   dot: 'bg-amber-500' },
  qualified: { label: 'Qualified', color: 'text-purple-700',  bg: 'bg-purple-50',  dot: 'bg-purple-500' },
  converted: { label: 'Converted', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  lost:      { label: 'Lost',      color: 'text-gray-500',    bg: 'bg-gray-100',   dot: 'bg-gray-400' },
};

const intentCfg: Record<string, { color: string; bg: string }> = {
  'Purchase Intent':  { color: 'text-emerald-700', bg: 'bg-emerald-50' },
  'Demo Request':     { color: 'text-blue-700',    bg: 'bg-blue-50' },
  'Technical Inquiry': { color: 'text-violet-700',  bg: 'bg-violet-50' },
  'Support Request':  { color: 'text-amber-700',   bg: 'bg-amber-50' },
  'Churn Risk':       { color: 'text-red-700',     bg: 'bg-red-50' },
  'General Inquiry':  { color: 'text-sky-700',     bg: 'bg-sky-50' },
  'Exploring':        { color: 'text-gray-600',    bg: 'bg-gray-100' },
};

function scoreLabel(s: number): { label: string; color: string; bg: string } {
  if (s >= 70) return { label: 'High', color: 'text-emerald-700', bg: 'bg-emerald-500' };
  if (s >= 40) return { label: 'Medium', color: 'text-amber-700', bg: 'bg-amber-500' };
  return { label: 'Low', color: 'text-gray-600', bg: 'bg-gray-400' };
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24);
  if (dd < 7) return `${dd}d ago`;
  return `${Math.floor(dd / 7)}w ago`;
}

const inputCls = inputStylesSm;

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterScore, setFilterScore] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editNotes, setEditNotes] = useState(false);
  const [notesVal, setNotesVal] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  /* ── Fetch ──────────────────────────────────────────────────────────────── */
  const fetchLeads = useCallback(async (s?: string) => {
    try {
      const p = new URLSearchParams();
      const q = s ?? search;
      if (q) p.set('search', q);
      if (filterStatus) p.set('status', filterStatus);
      // Score filter maps to rating for backend compatibility
      if (filterScore === 'high') p.set('rating', 'hot');
      else if (filterScore === 'low') p.set('rating', 'cold');
      const qs = p.toString();
      const data = await api.get<LeadsResponse>(`/leads${qs ? `?${qs}` : ''}`);
      setLeads(data.leads);
      setCounts(data.counts);
    } catch { setToast({ message: 'Failed to load leads', type: 'error' }); }
    finally { setLoading(false); }
  }, [search, filterStatus, filterScore]);

  useEffect(() => { setLoading(true); fetchLeads(); }, [filterStatus, filterScore]); // eslint-disable-line

  const handleSearch = (v: string) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setLoading(true); fetchLeads(v); }, 300);
  };

  /* ── Update / Delete ───────────────────────────────────────────────────── */
  const updateLead = async (id: string, data: Record<string, string>) => {
    setUpdatingId(id);
    try {
      const updated = await api.patch<Lead>(`/leads/${id}`, data);
      setLeads(prev => prev.map(l => l.id === id ? updated : l));
      if (selectedLead?.id === id) setSelectedLead(updated);
      const fresh = await api.get<LeadsResponse>('/leads');
      setCounts(fresh.counts);
      return updated;
    } catch (err) {
      setToast({ message: err instanceof ApiError ? err.message : 'Update failed', type: 'error' });
      return null;
    } finally { setUpdatingId(null); }
  };

  const deleteLead = async (id: string) => {
    try {
      await api.delete(`/leads/${id}`);
      setLeads(prev => prev.filter(l => l.id !== id));
      if (selectedLead?.id === id) setSelectedLead(null);
      setToast({ message: 'Lead removed', type: 'success' });
      fetchLeads();
    } catch { setToast({ message: 'Delete failed', type: 'error' }); }
  };

  const openDetail = async (lead: Lead) => {
    setSelectedLead(lead); setNotesVal(lead.notes ?? ''); setEditNotes(false);
    try { const fresh = await api.get<Lead>(`/leads/${lead.id}`); setSelectedLead(fresh); setNotesVal(fresh.notes ?? ''); } catch {}
  };

  const totalLeads = Object.values(counts).reduce((a, b) => a + b, 0);
  const highIntent = leads.filter(l => l.score >= 70).length;
  const hasFilters = filterStatus || filterScore;

  /* ── Subcomponents ─────────────────────────────────────────────────────── */

  const ScoreBar = ({ score }: { score: number }) => {
    const s = scoreLabel(score);
    return (
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', s.bg)} style={{ width: `${score}%` }} />
        </div>
        <span className={cn('text-xs font-medium', s.color)}>{score}</span>
      </div>
    );
  };

  const IntentBadge = ({ intent }: { intent: string | null }) => {
    if (!intent) return <span className="text-xs text-muted-foreground">-</span>;
    const c = intentCfg[intent] ?? intentCfg['Exploring'];
    return (
      <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium', c.bg, c.color)}>
        <Sparkles className="h-3 w-3" />{intent}
      </span>
    );
  };

  const StatusSelect = ({ lead }: { lead: Lead }) => (
    <select
      value={lead.status}
      disabled={updatingId === lead.id}
      onChange={e => { e.stopPropagation(); updateLead(lead.id, { status: e.target.value }); }}
      onClick={e => e.stopPropagation()}
      className={cn(
        'appearance-none rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-opacity',
        statusCfg[lead.status]?.bg, statusCfg[lead.status]?.color,
        updatingId === lead.id && 'opacity-50',
      )}
    >
      {STATUSES.map(s => <option key={s} value={s}>{statusCfg[s].label}</option>)}
    </select>
  );

  /* ═══════════════════════════════════════════════════════════════════════ */

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Detail Drawer ──────────────────────────────────────────────────── */}
      {selectedLead && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSelectedLead(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l bg-card shadow-xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-card px-6 py-4">
              <button onClick={() => setSelectedLead(null)} className="rounded-md p-1 hover:bg-muted"><ArrowLeft className="h-5 w-5" /></button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold truncate">{selectedLead.name}</h2>
                  <ScoreBar score={selectedLead.score} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {selectedLead.email && <span className="text-xs text-muted-foreground truncate">{selectedLead.email}</span>}
                </div>
              </div>
              <button onClick={() => deleteLead(selectedLead.id)} className="rounded-md p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>

            {/* Pipeline */}
            <div className="px-6 pt-4">
              <div className="flex gap-1">
                {STATUSES.filter(s => s !== 'lost').map((s) => {
                  const idx = STATUSES.indexOf(selectedLead.status);
                  const stIdx = STATUSES.indexOf(s);
                  const active = selectedLead.status !== 'lost' && stIdx <= idx;
                  return (
                    <button key={s} onClick={() => updateLead(selectedLead.id, { status: s })}
                      className={cn('flex-1 rounded-full py-1 text-[10px] font-semibold uppercase tracking-wider text-center transition-all',
                        active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                      {statusCfg[s].label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-5 p-6">
              {/* AI Insights card */}
              <div className="rounded-lg border bg-gradient-to-br from-violet-50/50 to-blue-50/50 dark:from-violet-950/20 dark:to-blue-950/20 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-violet-600" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">AI Insights</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">Intent</p>
                    <IntentBadge intent={selectedLead.intent} />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">Lead Score</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold">{selectedLead.score}</span>
                      <span className={cn('text-xs font-medium', scoreLabel(selectedLead.score).color)}>
                        {scoreLabel(selectedLead.score).label}
                      </span>
                    </div>
                  </div>
                </div>
                {selectedLead.aiSummary && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">Summary</p>
                    <p className="text-sm text-foreground">{selectedLead.aiSummary}</p>
                  </div>
                )}
              </div>

              {/* Contact */}
              <div className="space-y-2">
                {selectedLead.email && <div className="flex items-center gap-3 text-sm"><Mail className="h-4 w-4 text-muted-foreground" />{selectedLead.email}</div>}
                {selectedLead.phone && <div className="flex items-center gap-3 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{selectedLead.phone}</div>}
              </div>

              {/* Conversation */}
              {selectedLead.conversationId && (
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{selectedLead.messageCount} messages</span>
                    </div>
                    <a href={`/dashboard/conversations?id=${selectedLead.conversationId}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                      Open chat <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  {selectedLead.firstMessage && (
                    <p className="text-sm text-muted-foreground italic">&ldquo;{selectedLead.firstMessage}&rdquo;</p>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-muted-foreground">Notes</p>
                  {!editNotes && <button onClick={() => setEditNotes(true)} className="text-xs text-primary hover:underline">Edit</button>}
                </div>
                {editNotes ? (
                  <div className="space-y-2">
                    <textarea value={notesVal} onChange={e => setNotesVal(e.target.value)} rows={3} className={cn(inputCls, 'h-auto py-2')} />
                    <div className="flex gap-2">
                      <button onClick={async () => { await updateLead(selectedLead.id, { notes: notesVal }); setEditNotes(false); }}
                        className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                        <Check className="h-3 w-3" /> Save
                      </button>
                      <button onClick={() => { setEditNotes(false); setNotesVal(selectedLead.notes ?? ''); }} className="rounded-md px-3 py-1.5 text-xs font-medium hover:bg-muted">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedLead.notes || 'No notes yet'}</p>
                )}
              </div>

              {/* Actions */}
              {selectedLead.status !== 'converted' && selectedLead.status !== 'lost' && (
                <div className="flex gap-2 pt-2 border-t">
                  <button onClick={() => updateLead(selectedLead.id, { status: 'lost' })}
                    className="flex-1 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                    Mark Lost
                  </button>
                  <button onClick={() => updateLead(selectedLead.id, { status: 'converted' })}
                    className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                    Convert
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Header with KPIs ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Lead Intelligence</h1>
            <Sparkles className="h-5 w-5 text-violet-500" />
          </div>
          <p className="text-muted-foreground">AI-scored leads from chat conversations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border px-3 py-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">{totalLeads}</span>
            <span className="text-xs text-muted-foreground">total</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/30">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">{highIntent}</span>
            <span className="text-xs text-emerald-600">high intent</span>
          </div>
          {STATUSES.slice(0, 3).map(s => (
            <span key={s} className={cn('hidden xl:inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', statusCfg[s].bg, statusCfg[s].color)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', statusCfg[s].dot)} />
              {counts[s] ?? 0} {statusCfg[s].label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Controls ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
        <div className="flex items-center gap-2">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={cn(inputCls, 'w-32')}>
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{statusCfg[s].label}</option>)}
          </select>
          <select value={filterScore} onChange={e => setFilterScore(e.target.value)} className={cn(inputCls, 'w-32')}>
            <option value="">All Scores</option>
            <option value="high">High (70+)</option>
            <option value="low">Low (&lt;40)</option>
          </select>
          {hasFilters && (
            <button onClick={() => { setFilterStatus(''); setFilterScore(''); }} className="text-xs text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-lg border bg-card shadow-sm">
          {leads.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2">
              <Sparkles className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No leads yet. Leads appear automatically when visitors chat.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Lead</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Intent</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Score</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">AI Summary</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Msgs</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leads.map(lead => {
                    const isHigh = lead.score >= 70;
                    return (
                      <tr key={lead.id}
                        className={cn('cursor-pointer transition-colors hover:bg-muted/40', isHigh && 'bg-emerald-50/30 dark:bg-emerald-950/10')}
                        onClick={() => openDetail(lead)}>
                        {/* Lead */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                              isHigh ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                                     : 'bg-muted text-muted-foreground',
                            )}>
                              {lead.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{lead.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{lead.email ?? 'Anonymous'}</p>
                            </div>
                          </div>
                        </td>
                        {/* Intent */}
                        <td className="px-4 py-3"><IntentBadge intent={lead.intent} /></td>
                        {/* Score */}
                        <td className="px-4 py-3"><ScoreBar score={lead.score} /></td>
                        {/* AI Summary */}
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <p className="text-xs text-muted-foreground max-w-[240px] truncate">{lead.aiSummary ?? '-'}</p>
                        </td>
                        {/* Messages */}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageSquare className="h-3 w-3" />{lead.messageCount}
                          </span>
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3"><StatusSelect lead={lead} /></td>
                        {/* Activity */}
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                            <Clock className="h-3 w-3" />{timeAgo(lead.updatedAt)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
