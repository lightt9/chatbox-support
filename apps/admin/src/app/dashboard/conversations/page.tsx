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
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

// ── Types ───────────────────────────────────────────────────────────────────

interface VisitorMeta {
  ip?: string;
  country?: string;
  city?: string;
  device?: string;
  browser?: string;
  os?: string;
}

interface Conversation {
  id: string; customerName: string; customerEmail: string | null;
  customerPhone: string | null;
  channel: string; subject: string | null; status: string;
  assignedAgent: string | null; resolvedBy: string | null;
  priority: string; tags: string[]; starred: boolean; internalNotes: string;
  metadata: VisitorMeta;
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
  open: { label: 'Active', color: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300', dot: 'bg-green-500' },
  escalated: { label: 'Escalated', color: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300', dot: 'bg-red-500' },
  resolved: { label: 'Resolved', color: 'bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-300', dot: 'bg-gray-400' },
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
  const [customerTyping, setCustomerTyping] = useState<{ name: string; draft: string } | null>(null);
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

  const socketRef = useRef<Socket | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;
  const fetchConversationsRef = useRef(fetchConversations);
  fetchConversationsRef.current = fetchConversations;

  // ── Polling + SLA ─────────────────────────────────────────────────────

  useEffect(() => {
    fetchConversations(true);
    fetchOperators();
    fetchTemplates();
    pollRef.current = setInterval(() => {
      fetchConversations();
      if (selectedId) fetchMessages(selectedId);
    }, 5000); // Reduced frequency since we have WebSocket now
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchConversations, fetchMessages, fetchOperators, fetchTemplates, selectedId]);

  // ── WebSocket for real-time updates ──────────────────────────────────

  useEffect(() => {
    const socket = io(`${WS_URL}/chat`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Join the dashboard room for this company
      if (user?.companyId) {
        socket.emit('join:dashboard', { companyId: user.companyId });
      }
    });

    // When a new message arrives, update the messages list and conversation list
    socket.on('message:new', (msg: Message) => {
      if (msg.conversationId === selectedIdRef.current) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Clear typing preview when customer's actual message arrives
        if (msg.senderType === 'customer') {
          setCustomerTyping(null);
        }
      }
      fetchConversationsRef.current();
    });

    // When a conversation is created or updated
    socket.on('conversation:update', () => {
      fetchConversations();
    });

    // Customer live typing preview
    socket.on('typing:preview', (data: { conversationId: string; senderType: string; senderName?: string; draft: string }) => {
      if (data.senderType !== 'customer') return;
      // Show if viewing this conversation OR if it's any conversation in our dashboard
      const isSelected = data.conversationId === selectedIdRef.current ||
        data.conversationId === 'pending'; // Pre-conversation typing
      if (isSelected) {
        if (data.draft) {
          setCustomerTyping({ name: data.senderName ?? 'Customer', draft: data.draft });
        } else {
          setCustomerTyping(null);
        }
      }
    });

    socket.on('stop:typing', (data: { conversationId: string; senderType: string }) => {
      if (data.senderType !== 'customer') return;
      const isSelected = data.conversationId === selectedIdRef.current ||
        data.conversationId === 'pending';
      if (isSelected) {
        setCustomerTyping(null);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.companyId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, customerTyping]);

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

  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastJoinedConvRef = useRef<string | null>(null);

  // ── Actions ───────────────────────────────────────────────────────────

  const selectConv = (id: string) => {
    // Leave previous conversation room
    if (lastJoinedConvRef.current && socketRef.current) {
      socketRef.current.emit('leave:conversation', { conversationId: lastJoinedConvRef.current });
    }
    setSelectedId(id); setDraft(''); setShowAssignDD(false); setShowTemplates(false); setEditingNotes(false); setSuggestions([]); setCustomerTyping(null);
    fetchMessages(id, true); fetchSuggestions(id);
    const c = conversations.find((x) => x.id === id);
    if (c) setNoteDraft(c.internalNotes ?? '');
    setTimeout(() => inputRef.current?.focus(), 100);

    // Join conversation room + emit seen
    if (socketRef.current) {
      socketRef.current.emit('join:conversation', { conversationId: id });
      socketRef.current.emit('message:seen', {
        conversationId: id,
        seenBy: user?.name ?? 'Agent',
        seenByType: 'agent',
      });
      lastJoinedConvRef.current = id;
    }
  };

  const handleSend = async (text?: string) => {
    const msg = (text ?? draft).trim();
    if (!msg || !selectedId || sending) return;
    setDraft(''); setShowTemplates(false); setSending(true);
    // Stop typing indicator
    if (socketRef.current) {
      socketRef.current.emit('stop:typing', { conversationId: selectedId, senderType: 'agent', senderName: user?.name });
    }
    try {
      const newMsg = await api.post<Message>(`/conversations/${selectedId}/messages`, { message: msg });
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
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
    <div className="flex h-[calc(100vh-5rem)] overflow-hidden rounded-xl border border-border/40 bg-card" style={{ boxShadow: 'var(--shadow-sm)' }}>

      {/* ═══ LEFT: Conversation List ═══ */}
      <div className={cn('flex w-full flex-col md:w-[320px] md:shrink-0', selectedId && 'hidden md:flex')} style={{ borderRight: '1px solid hsl(var(--border) / 0.4)' }}>

        {/* Header + Search */}
        <div className="px-5 pt-5 pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Chats</h1>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {counts.open + counts.escalated}
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
            <input type="text" placeholder="Search..." value={search}
              onChange={(e) => { setSearch(e.target.value); if (searchTimer.current) clearTimeout(searchTimer.current); searchTimer.current = setTimeout(() => fetchConversations(true), 300); }}
              className="h-8 w-full rounded-lg border border-border/40 bg-background pl-8 pr-3 text-[12px] placeholder:text-muted-foreground/50 focus-visible:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-colors duration-150" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-px px-5 pb-2">
          {statusTabs.map((t) => (
            <button key={t.key} onClick={() => { setStatusFilter(t.key); fetchConversations(true); }}
              className={cn('flex-1 cursor-pointer rounded-lg py-1.5 text-[11px] font-medium transition-colors duration-150',
                statusFilter === t.key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}>
              {t.label}{t.count > 0 && <span className="ml-1 opacity-60">{t.count}</span>}
            </button>
          ))}
        </div>

        {/* Assign filter */}
        <div className="flex gap-1 px-5 pb-3">
          {assignTabs.map((t) => (
            <button key={t.key} onClick={() => { setAssignedFilter(t.key); fetchConversations(true); }}
              className={cn('cursor-pointer rounded-lg px-2 py-1 text-[10px] font-medium transition-colors duration-150',
                assignedFilter === t.key ? 'bg-muted text-foreground' : 'text-muted-foreground/70 hover:text-muted-foreground')}>
              {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-5 space-y-4">{[1,2,3,4].map((i) => <div key={i} className="flex gap-3 animate-pulse"><div className="h-9 w-9 rounded-full bg-muted shrink-0" /><div className="flex-1 space-y-2"><div className="h-3 w-2/3 rounded-md bg-muted" /><div className="h-2.5 w-full rounded-md bg-muted" /></div></div>)}</div>
          ) : conversations.length === 0 ? (
            <div className="mx-5 mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/40 py-10"><MessageSquare className="h-8 w-8 text-muted-foreground/30" /><p className="mt-2 text-[12px] text-muted-foreground">No conversations</p></div>
          ) : (
            <div className="px-2">
              {conversations.map((conv) => {
                const cfg = statusCfg[conv.status] ?? statusCfg.open;
                const active = selectedId === conv.id;
                const unread = conv.lastSenderType === 'customer' && !active;
                return (
                  <div key={conv.id} role="button" tabIndex={0} onClick={() => selectConv(conv.id)} onKeyDown={(e) => { if (e.key === 'Enter') selectConv(conv.id); }}
                    className={cn('group relative flex gap-3 rounded-xl px-3 py-3 cursor-pointer transition-all duration-200',
                      active ? 'bg-primary/[0.07]' : 'hover:bg-muted/30')}>
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className={cn('flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold',
                        active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
                        {initials(conv.customerName)}
                      </div>
                      <span className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card', cfg.dot)} />
                    </div>
                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                          {conv.starred && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
                          <span className={cn('text-[12px] truncate', unread ? 'font-bold' : 'font-medium')}>{conv.customerName}</span>
                        </div>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(conv.lastMessageAt ?? conv.createdAt)}</span>
                      </div>
                      <p className={cn('mt-0.5 text-[11px] truncate', unread ? 'text-foreground' : 'text-muted-foreground')}>{conv.lastMessage ?? 'No messages'}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-medium', cfg.color)}>{cfg.label}</span>
                        {conv.assignedAgent && <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><UserCheck className="h-2.5 w-2.5" />{conv.assignedAgent.split(' ')[0]}</span>}
                        {conv.lastSenderType === 'ai' && <Bot className="h-2.5 w-2.5 text-cyan-500" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ CENTER: Chat ═══ */}
      <div className={cn('flex flex-1 flex-col', !selectedId && 'hidden md:flex')}>
        {!selectedId ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/40 px-10 py-14"><MessageSquare className="h-10 w-10 text-muted-foreground/30" /><p className="mt-3 text-sm font-medium text-muted-foreground">Select a conversation</p></div>
          </div>
        ) : (
          <>
            {/* Chat header bar */}
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid hsl(var(--border) / 0.4)' }}>
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setSelectedId(null)} className="md:hidden cursor-pointer rounded-lg p-1 hover:bg-muted/40 transition-colors duration-150"><ArrowLeft className="h-4 w-4" /></button>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">{initials(selected?.customerName ?? '')}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold truncate">{selected?.customerName}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-medium', statusCfg[selected?.status ?? 'open'].color)}>{statusCfg[selected?.status ?? 'open'].label}</span>
                    {aiHandled && <span className="rounded-full bg-cyan-50 dark:bg-cyan-500/10 px-2 py-0.5 text-[9px] font-medium text-cyan-600 dark:text-cyan-300 flex items-center gap-0.5"><Bot className="h-2.5 w-2.5" />AI</span>}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="capitalize">{selected?.channel?.replace('_', ' ')}</span>
                    {selected?.customerEmail && <><span>&middot;</span><span className="truncate">{selected.customerEmail}</span></>}
                    {slaText && <><span>&middot;</span><span className="text-amber-600 dark:text-amber-300 font-medium flex items-center gap-0.5"><Timer className="h-2.5 w-2.5" />{slaText}</span></>}
                  </div>
                </div>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {aiHandled ? (
                  <button onClick={() => handleAssignTo(user?.name ?? null)} className="cursor-pointer rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] font-medium text-primary transition-colors duration-150 hover:bg-primary/15"><Hand className="mr-1 inline h-3 w-3" />Take over</button>
                ) : selected?.assignedAgent && selected.status !== 'resolved' ? (
                  <button onClick={() => handleAssignTo(null)} className="cursor-pointer rounded-lg px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors duration-150 hover:bg-muted/40"><RotateCcw className="mr-1 inline h-3 w-3" />Return to AI</button>
                ) : null}
                {/* Assign dropdown */}
                <div className="relative">
                  <button onClick={() => setShowAssignDD(!showAssignDD)} className="cursor-pointer rounded-lg border border-border/40 px-2 py-1.5 text-[11px] font-medium transition-colors duration-150 hover:bg-muted/40">
                    <UserCheck className="mr-1 inline h-3 w-3" /><span className="hidden sm:inline">{selected?.assignedAgent?.split(' ')[0] ?? 'Assign'}</span><ChevronDown className="ml-0.5 inline h-3 w-3" />
                  </button>
                  {showAssignDD && (
                    <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-border/40 bg-popover p-1" style={{ boxShadow: 'var(--shadow-sm)' }}>
                      <button onClick={() => handleAssignTo(null)} className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] hover:bg-muted/40 transition-colors duration-150"><UserX className="h-3.5 w-3.5 text-muted-foreground" />Unassign</button>
                      <div className="my-1" style={{ borderBottom: '1px solid hsl(var(--border) / 0.4)' }} />
                      {operators.map((op) => (
                        <button key={op.id} onClick={() => handleAssignTo(op.name)} className={cn('flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] hover:bg-muted/40 transition-colors duration-150', selected?.assignedAgent === op.name && 'bg-primary/10 text-primary')}>
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[8px] font-bold">{initials(op.name)}</div>
                          <span className="flex-1">{op.name}</span>
                          <span className={cn('h-1.5 w-1.5 rounded-full', op.status === 'online' ? 'bg-green-500' : 'bg-gray-300')} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selected?.status === 'open' && <button onClick={handleEscalate} className="cursor-pointer rounded-lg p-1.5 text-amber-500 transition-colors duration-150 hover:bg-amber-50 dark:hover:bg-amber-500/10" title="Escalate"><AlertTriangle className="h-3.5 w-3.5" /></button>}
                {selected?.status === 'resolved' ? (
                  <button onClick={handleReopen} className="cursor-pointer rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-amber-600 transition-colors duration-150 hover:bg-amber-50 dark:hover:bg-amber-500/10">Reopen</button>
                ) : (
                  <button onClick={handleResolve} className="cursor-pointer rounded-lg bg-green-50 dark:bg-green-500/10 px-2.5 py-1.5 text-[11px] font-medium text-green-700 dark:text-green-300 transition-colors duration-150 hover:bg-green-100 dark:hover:bg-green-500/15"><CheckCircle2 className="mr-1 inline h-3 w-3" />Resolve</button>
                )}
              </div>
            </div>

            {/* Messages + Sidebar */}
            <div className="flex flex-1 overflow-hidden">
              {/* Messages */}
              <div className="flex flex-1 flex-col">
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
                  {msgsLoading ? (
                    <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center py-16"><p className="text-[12px] text-muted-foreground">No messages yet</p></div>
                  ) : (
                    <>
                      {messages.map((msg, idx) => {
                        const isCust = msg.senderType === 'customer';
                        const isAi = msg.senderType === 'ai';
                        const prev = messages[idx - 1];
                        const showDate = !prev || new Date(msg.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
                        const grouped = prev && prev.senderType === msg.senderType && !showDate;
                        return (
                          <div key={msg.id}>
                            {showDate && (
                              <div className="flex items-center gap-3 py-2"><div className="h-px flex-1 bg-border/30" /><span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{new Date(msg.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span><div className="h-px flex-1 bg-border/30" /></div>
                            )}
                            <div className={cn('flex gap-2', isCust ? 'justify-start' : 'justify-end', !grouped && 'mt-3')}>
                              {isCust && <div className={cn('mt-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold', grouped && 'invisible')}>{initials(msg.senderName ?? 'C')}</div>}
                              <div className={cn('max-w-[70%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed',
                                isCust ? 'bg-muted rounded-bl-md' : isAi ? 'bg-cyan-50/80 dark:bg-cyan-500/10 text-cyan-900 dark:text-cyan-100 rounded-br-md' : 'bg-primary text-primary-foreground rounded-br-md')}>
                                {!isCust && !grouped && <p className="mb-0.5 text-[9px] font-semibold opacity-60 flex items-center gap-1">{isAi && <Bot className="h-2.5 w-2.5" />}{isAi ? 'AI' : msg.senderName}</p>}
                                <p className="whitespace-pre-wrap">{msg.body}</p>
                                <p className={cn('mt-1 text-[9px] opacity-40', isCust ? 'text-left' : 'text-right')}>{formatTime(msg.createdAt)}</p>
                              </div>
                              {!isCust && <div className={cn('mt-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold', isAi ? 'bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300' : 'bg-primary/15 text-primary', grouped && 'invisible')}>{isAi ? <Bot className="h-3 w-3" /> : initials(msg.senderName ?? 'A')}</div>}
                            </div>
                          </div>
                        );
                      })}

                      {/* Customer typing preview */}
                      {customerTyping && (
                        <div className="flex gap-2 justify-start mt-3">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold">{customerTyping.name[0]?.toUpperCase()}</div>
                          <div className="rounded-2xl rounded-bl-md bg-muted/60 px-3 py-2">
                            <div className="flex items-center gap-2 mb-0.5">
                              <div className="flex gap-[2px]"><span className="h-1 w-1 animate-bounce rounded-full bg-primary/50" style={{animationDelay:'0ms'}} /><span className="h-1 w-1 animate-bounce rounded-full bg-primary/50" style={{animationDelay:'150ms'}} /><span className="h-1 w-1 animate-bounce rounded-full bg-primary/50" style={{animationDelay:'300ms'}} /></div>
                              <span className="text-[10px] font-medium text-primary/70">{customerTyping.name} is typing</span>
                            </div>
                            {customerTyping.draft && <p className="text-[12px] italic text-muted-foreground/40 select-none" style={{filter:'blur(0.3px)'}}>{customerTyping.draft}</p>}
                          </div>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* AI Suggestions - click to INSERT into input, not auto-send */}
                {selected?.status !== 'resolved' && suggestions.length > 0 && (
                  <div className="bg-muted/20 px-5 py-3" style={{ borderTop: '1px solid hsl(var(--border) / 0.3)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-3 w-3 text-purple-500" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">Suggestions</span>
                      <button onClick={() => selectedId && fetchSuggestions(selectedId)} className="ml-auto cursor-pointer text-muted-foreground hover:text-foreground transition-colors duration-150">{sugLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}</button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {suggestions.map((s, i) => (
                        <button key={i} onClick={() => setDraft(s)} className="cursor-pointer rounded-lg border border-purple-200/50 dark:border-purple-500/20 bg-card px-2.5 py-1.5 text-[11px] text-foreground hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors duration-150 max-w-[240px] text-left truncate">{s}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Templates */}
                {showTemplates && selected?.status !== 'resolved' && (
                  <div className="bg-card px-5 py-3 max-h-40 overflow-y-auto" style={{ borderTop: '1px solid hsl(var(--border) / 0.3)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Saved Replies</p>
                    {Object.entries(templatesByCategory).map(([cat, tpls]) => (
                      <div key={cat} className="mb-2">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground/50 mb-1">{cat}</p>
                        {tpls.map((t) => (
                          <button key={t.id} onClick={() => { setDraft(t.content); setShowTemplates(false); inputRef.current?.focus(); }} className="w-full cursor-pointer rounded-lg px-2.5 py-1.5 text-left hover:bg-muted/40 transition-colors duration-150">
                            <span className="text-[11px] font-medium">{t.title}</span>
                            {t.shortcut && <code className="ml-1.5 text-[9px] text-muted-foreground bg-muted px-1 py-0.5 rounded-md">{t.shortcut}</code>}
                          </button>
                        ))}
                      </div>
                    ))}
                    {templates.length === 0 && <p className="text-[11px] text-muted-foreground">No saved replies</p>}
                  </div>
                )}

                {/* Input */}
                {selected?.status !== 'resolved' && (
                  <div className="px-5 py-3" style={{ borderTop: '1px solid hsl(var(--border) / 0.4)' }}>
                    <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
                      <button type="button" onClick={() => setShowTemplates(!showTemplates)}
                        className={cn('cursor-pointer rounded-lg p-2 transition-colors duration-150', showTemplates ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/40')} title="Templates">
                        <FileText className="h-4 w-4" />
                      </button>
                      <input ref={inputRef} type="text" placeholder="Type a message..." value={draft}
                        onChange={(e) => {
                          setDraft(e.target.value);
                          if (e.target.value.startsWith('/') && !showTemplates) setShowTemplates(true);
                          if (!e.target.value.startsWith('/') && showTemplates && e.target.value.length <= 1) setShowTemplates(false);
                          if (socketRef.current && selectedId && e.target.value.trim()) {
                            socketRef.current.emit('typing', { conversationId: selectedId, senderType: 'agent', senderName: user?.name });
                            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                            typingTimerRef.current = setTimeout(() => { if (socketRef.current && selectedIdRef.current) socketRef.current.emit('stop:typing', { conversationId: selectedIdRef.current, senderType: 'agent', senderName: user?.name }); }, 2000);
                          }
                        }}
                        disabled={sending}
                        className="flex h-9 flex-1 rounded-lg border border-border/40 bg-background px-3 text-[13px] placeholder:text-muted-foreground/50 focus-visible:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 disabled:opacity-50 transition-colors duration-150" />
                      <button type="submit" disabled={!draft.trim() || sending} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors duration-150 hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed">
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* ═══ RIGHT: Customer Details ═══ */}
              {selected && (
                <div className="hidden w-[280px] shrink-0 lg:flex lg:flex-col overflow-y-auto" style={{ borderLeft: '1px solid hsl(var(--border) / 0.4)' }}>

                  {/* Customer info */}
                  <div className="p-5 space-y-4" style={{ borderBottom: '1px solid hsl(var(--border) / 0.4)' }}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">{initials(selected.customerName)}</div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold truncate">{selected.customerName}</p>
                        {selected.customerEmail && <p className="text-[11px] text-muted-foreground truncate">{selected.customerEmail}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div><p className="text-muted-foreground/70 text-[10px]">Channel</p><p className="font-medium capitalize">{selected.channel?.replace('_', ' ')}</p></div>
                      <div><p className="text-muted-foreground/70 text-[10px]">Messages</p><p className="font-medium">{selected.messageCount}</p></div>
                      <div><p className="text-muted-foreground/70 text-[10px]">Created</p><p className="font-medium">{new Date(selected.createdAt).toLocaleDateString()}</p></div>
                      <div>
                        <p className="text-muted-foreground/70 text-[10px]">Priority</p>
                        <div className="flex gap-0.5 mt-0.5">
                          {(['low', 'normal', 'high'] as const).map((p) => (
                            <button key={p} onClick={() => handleSetPriority(p)}
                              className={cn('cursor-pointer rounded-full px-2 py-0.5 text-[9px] font-medium capitalize transition-colors duration-150',
                                selected.priority === p
                                  ? p === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-500/10' : p === 'low' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10' : 'bg-muted text-foreground'
                                  : 'text-muted-foreground hover:bg-muted/40')}>
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Visitor info */}
                  {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                    <div className="px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--border) / 0.4)' }}>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1"><Globe className="h-3 w-3" />Visitor</p>
                      <div className="space-y-2 text-[11px]">
                        {selected.metadata.browser && <div className="flex justify-between"><span className="text-muted-foreground">Browser</span><span className="font-medium">{selected.metadata.browser}</span></div>}
                        {selected.metadata.os && <div className="flex justify-between"><span className="text-muted-foreground">OS</span><span className="font-medium">{selected.metadata.os}</span></div>}
                        {selected.metadata.device && <div className="flex justify-between"><span className="text-muted-foreground">Device</span><span className="font-medium capitalize">{selected.metadata.device}</span></div>}
                        {selected.metadata.ip && <div className="flex justify-between"><span className="text-muted-foreground">IP</span><span className="font-medium font-mono text-[10px]">{selected.metadata.ip}</span></div>}
                        {selected.customerPhone && <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-medium">{selected.customerPhone}</span></div>}
                      </div>
                    </div>
                  )}

                  {/* Analytics */}
                  {miniStats && (
                    <div className="px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--border) / 0.4)' }}>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1"><BarChart3 className="h-3 w-3" />Analytics</p>
                      <div className="grid grid-cols-3 gap-3 text-center text-[11px]">
                        <div><p className="text-lg font-bold">{miniStats.total}</p><p className="text-muted-foreground/70 text-[10px]">Msgs</p></div>
                        <div><p className="text-lg font-bold text-cyan-600 dark:text-cyan-400">{miniStats.aiPct}%</p><p className="text-muted-foreground/70 text-[10px]">AI</p></div>
                        <div><p className="text-lg font-bold text-primary">{miniStats.humanPct}%</p><p className="text-muted-foreground/70 text-[10px]">Human</p></div>
                      </div>
                      {miniStats.aiPct > 0 && <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden flex"><div className="bg-cyan-500 transition-all duration-200" style={{width:`${miniStats.aiPct}%`}} /><div className="bg-primary transition-all duration-200" style={{width:`${miniStats.humanPct}%`}} /></div>}
                    </div>
                  )}

                  {/* Tags */}
                  <div className="px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--border) / 0.4)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Tag className="h-3 w-3" />Tags</p>
                      <button onClick={() => setShowTagInput(!showTagInput)} className="cursor-pointer rounded-lg p-0.5 hover:bg-muted/40 transition-colors duration-150"><Plus className="h-3 w-3 text-muted-foreground" /></button>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {(selected.tags ?? []).map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                          {tag}<button onClick={() => handleRemoveTag(tag)} className="cursor-pointer hover:text-destructive transition-colors duration-150"><X className="h-2.5 w-2.5" /></button>
                        </span>
                      ))}
                      {(selected.tags ?? []).length === 0 && !showTagInput && <p className="text-[10px] text-muted-foreground">No tags</p>}
                    </div>
                    {showTagInput && (
                      <div className="mt-2 space-y-1.5">
                        <input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(newTag); } }}
                          placeholder="Add tag..." className="h-7 w-full rounded-lg border border-border/40 bg-background px-2 text-[11px] focus-visible:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-colors duration-150" />
                        <div className="flex gap-1.5 flex-wrap">
                          {TAG_PRESETS.filter((t) => !(selected.tags ?? []).includes(t)).slice(0, 5).map((t) => (
                            <button key={t} onClick={() => handleAddTag(t)} className="cursor-pointer rounded-full bg-muted px-2 py-0.5 text-[9px] text-muted-foreground hover:text-foreground transition-colors duration-150">+{t}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="px-5 py-4 flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><StickyNote className="h-3 w-3" />Notes</p>
                      {!editingNotes && <button onClick={() => { setEditingNotes(true); setNoteDraft(selected.internalNotes ?? ''); }} className="cursor-pointer text-[10px] text-primary hover:underline transition-colors duration-150">Edit</button>}
                    </div>
                    {editingNotes ? (
                      <div className="space-y-1.5">
                        <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={4}
                          className="w-full rounded-lg border border-border/40 bg-background px-2.5 py-2 text-[11px] focus-visible:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 resize-none transition-colors duration-150" placeholder="Internal notes..." />
                        <div className="flex gap-2">
                          <button onClick={handleSaveNotes} className="cursor-pointer rounded-lg bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/90">Save</button>
                          <button onClick={() => setEditingNotes(false)} className="cursor-pointer rounded-lg px-3 py-1 text-[11px] text-muted-foreground transition-colors duration-150 hover:bg-muted/40">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{selected.internalNotes || 'No notes. Click Edit to add.'}</p>
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
