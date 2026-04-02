'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Search, MessageSquare, Clock, User, Send, ArrowLeft, CheckCircle2,
  AlertTriangle, UserCheck, UserX, Mail, Globe, Bot, Loader2, Star,
  Tag, StickyNote, ChevronDown, X, Plus, Sparkles, FileText,
  Timer, BarChart3, Hand, RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

// ── Types ───────────────────────────────────────────────────────────────────

interface Conversation {
  id: string; customerName: string; customerEmail: string | null;
  channel: string; subject: string | null; status: string;
  assignedAgent: string | null; resolvedBy: string | null;
  priority: string; tags: string[]; starred: boolean; internalNotes: string;
  createdAt: string; updatedAt: string; messageCount: number;
  lastMessage: string | null; lastMessageAt: string | null; lastSenderType: string | null;
}

interface Message {
  id: string; conversationId: string; senderType: string;
  senderName: string | null; body: string; createdAt: string;
}

interface Counts {
  total: number; open: number; escalated: number; resolved: number;
  unassigned: number; starred: number; mine: number; others: number;
}

interface Operator { id: string; name: string; status: string; }
interface Template { id: string; title: string; content: string; category: string; shortcut: string | null; }

// ── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(ts: string | null): string {
  if (!ts) return '';
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function slaTimer(lastMsgAt: string | null, senderType: string | null): string | null {
  if (!lastMsgAt || senderType !== 'customer') return null;
  const s = Math.floor((Date.now() - new Date(lastMsgAt).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

const statusCfg: Record<string, { label: string; color: string; dot: string }> = {
  open: { label: 'Active', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', dot: 'bg-green-500' },
  escalated: { label: 'Escalated', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', dot: 'bg-red-500' },
  resolved: { label: 'Resolved', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-300', dot: 'bg-gray-400' },
};

const TAG_PRESETS = ['VIP', 'Lead', 'Interested', 'Complaint', 'Bug', 'Feature Request', 'Spam'];

// ── Page ────────────────────────────────────────────────────────────────────

export default function ConversationsPage() {
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, open: 0, escalated: 0, resolved: 0, unassigned: 0, starred: 0, mine: 0, others: 0 });
  const [operators, setOperators] = useState<Operator[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sugLoading, setSugLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [assignedFilter, setAssignedFilter] = useState<string>('');

  const [showAssignDD, setShowAssignDD] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [slaText, setSlaText] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slaRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Data fetching ─────────────────────────────────────────────────────

  const fetchConversations = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const p = new URLSearchParams();
      if (statusFilter) p.set('status', statusFilter);
      if (search) p.set('search', search);
      if (assignedFilter) p.set('assigned', assignedFilter);
      p.set('limit', '50');
      const [res, c] = await Promise.all([
        api.get<{ data: Conversation[]; meta: any }>(`/conversations?${p}`),
        api.get<Counts>('/conversations/counts'),
      ]);
      setConversations(res.data);
      setCounts(c);
    } catch {}
    finally { if (isInitial) setLoading(false); }
  }, [statusFilter, search, assignedFilter]);

  const fetchMessages = useCallback(async (convId: string, isInitial = false) => {
    if (isInitial) setMsgsLoading(true);
    try { setMessages(await api.get<Message[]>(`/conversations/${convId}/messages`)); }
    catch {}
    finally { if (isInitial) setMsgsLoading(false); }
  }, []);

  const fetchOperators = useCallback(async () => {
    try { setOperators((await api.get<{ data: Operator[] }>('/operators?limit=50')).data); } catch {}
  }, []);

  const fetchTemplates = useCallback(async () => {
    try { setTemplates(await api.get<Template[]>('/conversations/templates/list')); } catch {}
  }, []);

  const fetchSuggestions = useCallback(async (convId: string) => {
    setSugLoading(true);
    try { setSuggestions((await api.get<{ suggestions: string[] }>(`/conversations/${convId}/suggestions`)).suggestions); }
    catch { setSuggestions([]); }
    finally { setSugLoading(false); }
  }, []);

  // ── Polling + SLA ─────────────────────────────────────────────────────

  useEffect(() => {
    fetchConversations(true);
    fetchOperators();
    fetchTemplates();
    pollRef.current = setInterval(() => {
      fetchConversations();
      if (selectedId) fetchMessages(selectedId);
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchConversations, fetchMessages, fetchOperators, fetchTemplates, selectedId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (slaRef.current) clearInterval(slaRef.current);
    const update = () => {
      const sel = conversations.find((c) => c.id === selectedId);
      setSlaText(sel ? slaTimer(sel.lastMessageAt, sel.lastSenderType) : null);
    };
    update();
    slaRef.current = setInterval(update, 1000);
    return () => { if (slaRef.current) clearInterval(slaRef.current); };
  }, [selectedId, conversations]);

  // ── Actions ───────────────────────────────────────────────────────────

  const selectConv = (id: string) => {
    setSelectedId(id); setDraft(''); setShowAssignDD(false); setShowTemplates(false); setEditingNotes(false); setSuggestions([]);
    fetchMessages(id, true); fetchSuggestions(id);
    const c = conversations.find((x) => x.id === id);
    if (c) setNoteDraft(c.internalNotes ?? '');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSend = async (text?: string) => {
    const msg = (text ?? draft).trim();
    if (!msg || !selectedId || sending) return;
    setDraft(''); setShowTemplates(false); setSending(true);
    try {
      const newMsg = await api.post<Message>(`/conversations/${selectedId}/messages`, { message: msg });
      setMessages((prev) => [...prev, newMsg]);
      fetchConversations(); fetchSuggestions(selectedId);
    } catch { setDraft(msg); }
    finally { setSending(false); inputRef.current?.focus(); }
  };

  const handleAssignTo = async (agentName: string | null) => { if (!selectedId) return; setShowAssignDD(false); try { await api.patch(`/conversations/${selectedId}/assign`, { agentName }); fetchConversations(); } catch {} };
  const handleResolve = async () => { if (!selectedId) return; try { await api.patch(`/conversations/${selectedId}/resolve`, {}); fetchConversations(); } catch {} };
  const handleReopen = async () => { if (!selectedId) return; try { await api.patch(`/conversations/${selectedId}/reopen`, {}); fetchConversations(); } catch {} };
  const handleEscalate = async () => { if (!selectedId) return; try { await api.post(`/conversations/${selectedId}/escalate`, {}); fetchConversations(); } catch {} };
  const handleToggleStar = async (id: string, e?: React.MouseEvent) => { e?.stopPropagation(); try { await api.patch(`/conversations/${id}/star`, {}); fetchConversations(); } catch {} };
  const handleSetPriority = async (p: string) => { if (!selectedId) return; try { await api.patch(`/conversations/${selectedId}/priority`, { priority: p }); fetchConversations(); } catch {} };
  const handleAddTag = async (tag: string) => { if (!selectedId || !tag.trim()) return; const c = conversations.find((x) => x.id === selectedId); const cur = c?.tags ?? []; if (cur.includes(tag.trim())) return; try { await api.patch(`/conversations/${selectedId}/tags`, { tags: [...cur, tag.trim()] }); fetchConversations(); } catch {} setNewTag(''); setShowTagInput(false); };
  const handleRemoveTag = async (tag: string) => { if (!selectedId) return; const c = conversations.find((x) => x.id === selectedId); try { await api.patch(`/conversations/${selectedId}/tags`, { tags: (c?.tags ?? []).filter((t) => t !== tag) }); fetchConversations(); } catch {} };
  const handleSaveNotes = async () => { if (!selectedId) return; try { await api.patch(`/conversations/${selectedId}/notes`, { notes: noteDraft }); fetchConversations(); } catch {} setEditingNotes(false); };

  const selected = conversations.find((c) => c.id === selectedId);
  const aiHandled = selected && !selected.assignedAgent && selected.status === 'open';

  const miniStats = (() => {
    if (!messages.length) return null;
    const aiMsgs = messages.filter((m) => m.senderType === 'ai').length;
    const agentMsgs = messages.filter((m) => m.senderType === 'agent').length;
    const total = aiMsgs + agentMsgs;
    return { total: messages.length, aiPct: total > 0 ? Math.round((aiMsgs / total) * 100) : 0, humanPct: total > 0 ? Math.round((agentMsgs / total) * 100) : 0 };
  })();

  const statusTabs = [
    { key: '', label: 'All', count: counts.total },
    { key: 'open', label: 'Active', count: counts.open },
    { key: 'escalated', label: 'Escalated', count: counts.escalated },
    { key: 'resolved', label: 'Resolved', count: counts.resolved },
  ];
  const assignTabs = [
    { key: '', label: 'Everyone', count: 0 },
    { key: 'me', label: 'Mine', count: counts.mine },
    { key: 'unassigned', label: 'Unassigned', count: counts.unassigned },
    { key: 'others', label: 'Others', count: counts.others },
  ];
  const templatesByCategory = templates.reduce<Record<string, Template[]>>((acc, t) => { (acc[t.category] ??= []).push(t); return acc; }, {});

  // ── RENDER ────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden rounded-xl border bg-card shadow-sm">

      {/* ═══════════ LEFT PANEL ═══════════ */}
      <div className={cn('flex w-full flex-col border-r md:w-[360px] lg:w-[400px] md:shrink-0', selectedId && 'hidden md:flex')}>

        {/* Header */}
        <div className="p-5 pb-4 space-y-4 border-b">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight">Inbox</h1>
            <div className="flex items-center gap-2">
              {counts.starred > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{counts.starred}
                </span>
              )}
              <span className="rounded-full bg-green-100 dark:bg-green-900/40 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-300">
                {counts.open + counts.escalated} active
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); if (searchTimer.current) clearTimeout(searchTimer.current); searchTimer.current = setTimeout(() => fetchConversations(true), 300); }}
              className="flex h-9 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-1.5 flex-wrap">
            {statusTabs.map((t) => (
              <button key={t.key} onClick={() => { setStatusFilter(t.key); fetchConversations(true); }}
                className={cn('rounded-full px-3 py-1.5 text-xs font-medium transition-colors', statusFilter === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')}>
                {t.label}
                {t.count > 0 && <span className="ml-1 opacity-70">{t.count}</span>}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {assignTabs.map((t) => (
              <button key={t.key} onClick={() => { setAssignedFilter(t.key); fetchConversations(true); }}
                className={cn('rounded-full px-3 py-1.5 text-xs font-medium transition-colors', assignedFilter === t.key ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted')}>
                {t.label}
                {t.count > 0 && <span className="ml-1 opacity-70">{t.count}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-3 space-y-2">{[1,2,3,4,5].map((i) => (
              <div key={i} className="animate-pulse rounded-xl p-4 flex gap-3">
                <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2"><div className="h-4 w-3/4 rounded bg-muted" /><div className="h-3 w-full rounded bg-muted" /></div>
              </div>
            ))}</div>
          ) : conversations.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3">
              <MessageSquare className="h-10 w-10 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">No conversations found</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {conversations.map((conv) => {
                const cfg = statusCfg[conv.status] ?? statusCfg.open;
                const isActive = selectedId === conv.id;
                const isUnread = conv.lastSenderType === 'customer' && !isActive;

                return (
                  <div
                    key={conv.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectConv(conv.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') selectConv(conv.id); }}
                    className={cn(
                      'group relative w-full rounded-xl p-3.5 text-left cursor-pointer transition-all duration-150',
                      isActive
                        ? 'bg-primary/10 ring-1 ring-primary/25'
                        : 'hover:bg-accent',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold',
                          isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
                        )}>
                          {initials(conv.customerName)}
                        </div>
                        <span className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card', cfg.dot)} />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                            {conv.starred && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                            <span className={cn('text-sm truncate', isUnread ? 'font-bold' : 'font-semibold')}>{conv.customerName}</span>
                            {conv.lastSenderType === 'ai' && <Bot className="h-3.5 w-3.5 shrink-0 text-cyan-500" />}
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(conv.lastMessageAt ?? conv.createdAt)}</span>
                        </div>

                        {conv.subject && (
                          <p className="mt-0.5 text-xs text-foreground/80 truncate">{conv.subject}</p>
                        )}

                        <p className={cn('mt-1 text-xs truncate', isUnread ? 'text-foreground' : 'text-muted-foreground')}>
                          {conv.lastMessage ?? 'No messages yet'}
                        </p>

                        <div className="mt-2 flex items-center gap-2">
                          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', cfg.color)}>
                            {cfg.label}
                          </span>
                          {conv.priority === 'high' && (
                            <span className="rounded-full bg-red-100 dark:bg-red-900/40 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:text-red-300">High</span>
                          )}
                          {conv.assignedAgent && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <UserCheck className="h-3 w-3" />{conv.assignedAgent}
                            </span>
                          )}
                          {conv.messageCount > 0 && (
                            <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />{conv.messageCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Hover star */}
                    <div className="absolute right-3 top-3 hidden group-hover:block">
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleToggleStar(conv.id, e)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleToggleStar(conv.id); } }}
                        className="rounded-md p-1.5 bg-card shadow-sm border cursor-pointer hover:bg-muted transition-colors"
                      >
                        <Star className={cn('h-3.5 w-3.5', conv.starred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground')} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ CENTER: Chat ═══════════ */}
      <div className={cn('flex flex-1 flex-col', !selectedId && 'hidden md:flex')}>
        {!selectedId ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <div>
                <p className="text-base font-medium text-foreground">Select a conversation</p>
                <p className="text-sm text-muted-foreground">Choose from the list to start chatting</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between border-b px-5 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setSelectedId(null)} className="md:hidden rounded-lg p-1.5 hover:bg-muted"><ArrowLeft className="h-5 w-5" /></button>
                <div className="relative shrink-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {initials(selected?.customerName ?? '')}
                  </div>
                  <span className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card', statusCfg[selected?.status ?? 'open'].dot)} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold truncate">{selected?.customerName}</h2>
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', statusCfg[selected?.status ?? 'open'].color)}>
                      {statusCfg[selected?.status ?? 'open'].label}
                    </span>
                    {aiHandled && (
                      <span className="rounded-full bg-cyan-100 dark:bg-cyan-900/40 px-2 py-0.5 text-[11px] font-medium text-cyan-700 dark:text-cyan-300 flex items-center gap-1">
                        <Bot className="h-3 w-3" />AI
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="capitalize">{selected?.channel}</span>
                    {selected?.customerEmail && <><span>·</span><span className="truncate">{selected.customerEmail}</span></>}
                    {slaText && <><span>·</span><span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium"><Timer className="h-3 w-3" />Waiting {slaText}</span></>}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {aiHandled ? (
                  <button onClick={() => handleAssignTo(user?.name ?? null)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                    <Hand className="h-3.5 w-3.5" /> Take over
                  </button>
                ) : selected?.assignedAgent && selected.status !== 'resolved' ? (
                  <button onClick={() => handleAssignTo(null)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                    <RotateCcw className="h-3.5 w-3.5" /> Return to AI
                  </button>
                ) : null}

                <div className="relative">
                  <button onClick={() => setShowAssignDD(!showAssignDD)} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted transition-colors">
                    <UserCheck className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline max-w-[80px] truncate">{selected?.assignedAgent ?? 'Assign'}</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {showAssignDD && (
                    <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border bg-popover p-1.5 shadow-lg">
                      <button onClick={() => handleAssignTo(null)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs hover:bg-muted transition-colors">
                        <UserX className="h-4 w-4 text-muted-foreground" /> Unassign
                      </button>
                      <div className="my-1 border-t" />
                      {operators.map((op) => (
                        <button key={op.id} onClick={() => handleAssignTo(op.name)}
                          className={cn('flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs hover:bg-muted transition-colors', selected?.assignedAgent === op.name && 'bg-primary/10 text-primary')}>
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold">{initials(op.name)}</div>
                          <span className="flex-1">{op.name}</span>
                          <span className={cn('h-2 w-2 rounded-full', op.status === 'online' ? 'bg-green-500' : 'bg-gray-300')} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selected?.status === 'open' && (
                  <button onClick={handleEscalate} className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Escalate">
                    <AlertTriangle className="h-4 w-4" />
                  </button>
                )}
                {selected?.status === 'resolved' ? (
                  <button onClick={handleReopen} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">Reopen</button>
                ) : (
                  <button onClick={handleResolve} className="inline-flex items-center gap-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 px-3 py-2 text-xs font-medium text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                  </button>
                )}
              </div>
            </div>

            {/* Messages + Sidebar */}
            <div className="flex flex-1 overflow-hidden">
              {/* Messages */}
              <div className="flex flex-1 flex-col">
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  {msgsLoading ? (
                    <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center py-16"><p className="text-sm text-muted-foreground">No messages yet</p></div>
                  ) : (
                    <>
                      {messages.map((msg, idx) => {
                        const isCust = msg.senderType === 'customer';
                        const isAi = msg.senderType === 'ai';
                        const prev = messages[idx - 1];
                        const showDate = !prev || new Date(msg.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
                        const sameSender = prev && prev.senderType === msg.senderType;

                        return (
                          <div key={msg.id}>
                            {showDate && (
                              <div className="flex items-center gap-4 py-3">
                                <div className="h-px flex-1 bg-border" />
                                <span className="text-xs font-medium text-muted-foreground">
                                  {new Date(msg.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </span>
                                <div className="h-px flex-1 bg-border" />
                              </div>
                            )}
                            <div className={cn('flex gap-2.5', isCust ? 'justify-start' : 'justify-end', !sameSender && 'mt-3')}>
                              {isCust && (
                                <div className={cn('mt-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold', sameSender && 'invisible')}>
                                  {initials(msg.senderName ?? 'C')}
                                </div>
                              )}
                              <div className={cn(
                                'max-w-[70%] rounded-2xl px-4 py-2.5',
                                isCust
                                  ? 'bg-muted rounded-bl-lg'
                                  : isAi
                                    ? 'bg-cyan-50 text-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200 rounded-br-lg'
                                    : 'bg-primary text-primary-foreground rounded-br-lg',
                              )}>
                                {!isCust && !sameSender && (
                                  <p className="mb-1 text-[11px] font-semibold opacity-70 flex items-center gap-1">
                                    {isAi && <Bot className="h-3 w-3" />}
                                    {isAi ? 'AI Assistant' : msg.senderName}
                                  </p>
                                )}
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                                <p className={cn('mt-1 text-[10px] opacity-50', isCust ? 'text-left' : 'text-right')}>{formatTime(msg.createdAt)}</p>
                              </div>
                              {!isCust && (
                                <div className={cn(
                                  'mt-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                                  isAi ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300' : 'bg-primary/20 text-primary',
                                  sameSender && 'invisible',
                                )}>
                                  {isAi ? <Bot className="h-3.5 w-3.5" /> : initials(msg.senderName ?? 'A')}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* AI Suggestions */}
                {selected?.status !== 'resolved' && suggestions.length > 0 && (
                  <div className="border-t bg-muted/30 px-5 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                      <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">AI Suggestions</span>
                      <button onClick={() => selectedId && fetchSuggestions(selectedId)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
                        {sugLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {suggestions.map((s, i) => (
                        <button key={i} onClick={() => handleSend(s)} className="rounded-lg border border-purple-200 dark:border-purple-800 bg-card px-3.5 py-2 text-xs text-foreground hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors max-w-[260px] text-left truncate">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Templates */}
                {showTemplates && selected?.status !== 'resolved' && (
                  <div className="border-t bg-card px-5 py-3 max-h-52 overflow-y-auto">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Saved Replies</p>
                    {Object.entries(templatesByCategory).map(([cat, tpls]) => (
                      <div key={cat} className="mb-3">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 mb-1">{cat}</p>
                        <div className="space-y-1">
                          {tpls.map((t) => (
                            <button key={t.id} onClick={() => { setDraft(t.content); setShowTemplates(false); inputRef.current?.focus(); }}
                              className="w-full rounded-lg px-3 py-2 text-left hover:bg-muted transition-colors">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium">{t.title}</span>
                                {t.shortcut && <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{t.shortcut}</code>}
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{t.content}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {templates.length === 0 && <p className="text-xs text-muted-foreground">No saved replies yet</p>}
                  </div>
                )}

                {/* Input */}
                {selected?.status !== 'resolved' && (
                  <div className="border-t px-4 py-3">
                    <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
                      <button type="button" onClick={() => setShowTemplates(!showTemplates)}
                        className={cn('rounded-lg p-2.5 transition-colors', showTemplates ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')} title="Saved Replies">
                        <FileText className="h-4 w-4" />
                      </button>
                      <input
                        ref={inputRef}
                        type="text"
                        placeholder="Type a message or / for templates..."
                        value={draft}
                        onChange={(e) => {
                          setDraft(e.target.value);
                          if (e.target.value.startsWith('/') && !showTemplates) setShowTemplates(true);
                          if (!e.target.value.startsWith('/') && showTemplates && e.target.value.length <= 1) setShowTemplates(false);
                        }}
                        disabled={sending}
                        className="flex h-10 flex-1 rounded-lg border border-input bg-background px-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      />
                      <button type="submit" disabled={!draft.trim() || sending}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40">
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* ═══════════ RIGHT: Sidebar ═══════════ */}
              {selected && (
                <div className="hidden w-72 shrink-0 border-l lg:flex lg:flex-col overflow-y-auto">

                  {/* Customer info */}
                  <div className="p-5 border-b space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {initials(selected.customerName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{selected.customerName}</p>
                        {selected.customerEmail && <p className="text-xs text-muted-foreground truncate">{selected.customerEmail}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground mb-0.5">Channel</p>
                        <p className="font-medium capitalize">{selected.channel}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-0.5">Messages</p>
                        <p className="font-medium">{selected.messageCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-0.5">Created</p>
                        <p className="font-medium">{new Date(selected.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-0.5">Priority</p>
                        <div className="flex gap-1 mt-0.5">
                          {(['low', 'normal', 'high'] as const).map((p) => (
                            <button key={p} onClick={() => handleSetPriority(p)}
                              className={cn('rounded-md px-2 py-1 text-[11px] font-medium capitalize transition-colors',
                                selected.priority === p
                                  ? p === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : p === 'low' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-muted text-foreground'
                                  : 'text-muted-foreground hover:bg-muted')}>
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Analytics */}
                  {miniStats && (
                    <div className="px-5 py-4 border-b">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
                        <BarChart3 className="h-3.5 w-3.5" /> Analytics
                      </h4>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div><p className="text-xl font-bold">{miniStats.total}</p><p className="text-xs text-muted-foreground">Messages</p></div>
                        <div><p className="text-xl font-bold text-cyan-600 dark:text-cyan-400">{miniStats.aiPct}%</p><p className="text-xs text-muted-foreground">AI</p></div>
                        <div><p className="text-xl font-bold text-primary">{miniStats.humanPct}%</p><p className="text-xs text-muted-foreground">Human</p></div>
                      </div>
                      {miniStats.aiPct > 0 && (
                        <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden flex">
                          <div className="bg-cyan-500 transition-all" style={{ width: `${miniStats.aiPct}%` }} />
                          <div className="bg-primary transition-all" style={{ width: `${miniStats.humanPct}%` }} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  <div className="px-5 py-4 border-b">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5" /> Tags
                      </h4>
                      <button onClick={() => setShowTagInput(!showTagInput)} className="rounded-md p-1 hover:bg-muted transition-colors">
                        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {(selected.tags ?? []).map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                          {tag}
                          <button onClick={() => handleRemoveTag(tag)} className="hover:text-destructive transition-colors"><X className="h-3 w-3" /></button>
                        </span>
                      ))}
                      {(selected.tags ?? []).length === 0 && !showTagInput && <p className="text-xs text-muted-foreground">No tags yet</p>}
                    </div>
                    {showTagInput && (
                      <div className="mt-3 space-y-2">
                        <input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(newTag); } }}
                          placeholder="Add tag..." className="h-8 w-full rounded-lg border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                        <div className="flex gap-1.5 flex-wrap">
                          {TAG_PRESETS.filter((t) => !(selected.tags ?? []).includes(t)).map((t) => (
                            <button key={t} onClick={() => handleAddTag(t)} className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">+{t}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="px-5 py-4 flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <StickyNote className="h-3.5 w-3.5" /> Internal Notes
                      </h4>
                      {!editingNotes && <button onClick={() => { setEditingNotes(true); setNoteDraft(selected.internalNotes ?? ''); }} className="text-xs text-primary hover:underline">Edit</button>}
                    </div>
                    {editingNotes ? (
                      <div className="space-y-2">
                        <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={5}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" placeholder="Add internal notes..." />
                        <div className="flex gap-2">
                          <button onClick={handleSaveNotes} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Save</button>
                          <button onClick={() => setEditingNotes(false)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{selected.internalNotes || 'No notes yet. Click Edit to add internal team notes.'}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
