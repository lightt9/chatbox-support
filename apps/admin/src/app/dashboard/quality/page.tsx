'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  Eye,
  Loader2,
  Plus,
  X,
  Check,
  Paperclip,
  Trash2,
  FileText,
  Download,
  ArrowLeft,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, ApiError } from '../../../lib/api';
import { Badge, BADGE_OPTIONS, getBadgeConfig } from '../../../components/badge';
import { Toast } from '../../../components/ui/Toast';
import { inputStylesSm } from '../../../components/ui/Input';

/* ── Types ──────────────────────────────────────────────────────────────────── */

interface TicketBadge {
  type: string;
  value: string;
}

interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  url: string;
  uploadedAt: string;
}

interface Ticket {
  id: string;
  displayId: string;
  conversationTitle: string;
  agentName: string;
  ticketType: string;
  severity: string;
  status: string;
  notes: string | null;
  attachments: Attachment[];
  badges: TicketBadge[];
  createdAt: string;
  updatedAt: string;
}

interface QualityResponse {
  tickets: Ticket[];
  counts: { open: number; investigating: number; resolved: number };
}

/* ── Constants ──────────────────────────────────────────────────────────────── */

const STATUSES = ['open', 'investigating', 'resolved'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const TICKET_TYPES = ['Incorrect Response', 'Hallucination', 'Tone Issue', 'Process Violation'];

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

const inputCls = inputStylesSm;

/* ── Badge Picker Popover ───────────────────────────────────────────────────── */

function BadgePicker({
  currentBadges,
  onUpdate,
  onClose,
}: {
  currentBadges: TicketBadge[];
  onUpdate: (badges: TicketBadge[]) => void;
  onClose: () => void;
}) {
  const has = (type: string, value: string) =>
    currentBadges.some((b) => b.type === type && b.value === value);

  const toggle = (type: string, value: string) => {
    if (has(type, value)) {
      onUpdate(currentBadges.filter((b) => !(b.type === type && b.value === value)));
    } else {
      onUpdate([...currentBadges, { type, value }]);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border bg-card p-3 shadow-xl">
        {Object.entries(BADGE_OPTIONS).map(([type, values]) => (
          <div key={type} className="mb-3 last:mb-0">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {type}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {values.map((v) => (
                <Badge
                  key={v}
                  value={v}
                  variant={has(type, v) ? 'solid' : 'outline'}
                  onClick={() => toggle(type, v)}
                  className="cursor-pointer"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function QualityPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [counts, setCounts] = useState({ open: 0, investigating: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Detail
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [showBadgePicker, setShowBadgePicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create
  const [newTitle, setNewTitle] = useState('');
  const [newAgent, setNewAgent] = useState('');
  const [newType, setNewType] = useState('Incorrect Response');
  const [newSeverity, setNewSeverity] = useState('medium');
  const [newNotes, setNewNotes] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  /* ── Fetch ────────────────────────────────────────────────────────────────── */
  const fetchTickets = useCallback(async (searchVal?: string) => {
    try {
      const params = new URLSearchParams();
      const q = searchVal ?? search;
      if (q) params.set('search', q);
      if (filterStatus) params.set('status', filterStatus);
      if (filterSeverity) params.set('severity', filterSeverity);
      if (filterType) params.set('ticketType', filterType);
      const qs = params.toString();
      const data = await api.get<QualityResponse>(`/quality${qs ? `?${qs}` : ''}`);
      setTickets(data.tickets);
      setCounts(data.counts);
    } catch {
      setToast({ message: 'Failed to load tickets', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterSeverity, filterType]);

  useEffect(() => { setLoading(true); fetchTickets(); }, [filterStatus, filterSeverity, filterType]); // eslint-disable-line

  const handleSearch = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setLoading(true); fetchTickets(val); }, 300);
  };

  /* ── Open detail ──────────────────────────────────────────────────────────── */
  const openDetail = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setNotesValue(ticket.notes ?? '');
    setEditingNotes(false);
    setShowBadgePicker(false);
    setDetailLoading(true);
    try { const fresh = await api.get<Ticket>(`/quality/${ticket.id}`); setSelectedTicket(fresh); setNotesValue(fresh.notes ?? ''); } catch {} finally { setDetailLoading(false); }
  };

  /* ── Update field ─────────────────────────────────────────────────────────── */
  const updateField = async (field: string, value: string) => {
    if (!selectedTicket) return;
    setUpdatingId(selectedTicket.id);
    try {
      const updated = await api.patch<Ticket>(`/quality/${selectedTicket.id}`, { [field]: value });
      setSelectedTicket(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      const fresh = await api.get<QualityResponse>('/quality');
      setCounts(fresh.counts);
      setToast({ message: 'Updated', type: 'success' });
    } catch (err) {
      setToast({ message: err instanceof ApiError ? err.message : 'Update failed', type: 'error' });
    } finally { setUpdatingId(null); }
  };

  /* ── Update badges ────────────────────────────────────────────────────────── */
  const updateBadges = async (ticketId: string, badges: TicketBadge[]) => {
    setUpdatingId(ticketId);
    try {
      const token = localStorage.getItem('accessToken') ?? sessionStorage.getItem('accessToken') ?? '';
      const res = await fetch(`/api/v1/quality/${ticketId}/badges`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ badges }),
      });
      if (!res.ok) throw new Error('Failed');
      const updated: Ticket = await res.json();
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      if (selectedTicket?.id === ticketId) setSelectedTicket(updated);
      setToast({ message: 'Badges updated', type: 'success' });
    } catch {
      setToast({ message: 'Failed to update badges', type: 'error' });
    } finally { setUpdatingId(null); }
  };

  /* ── Save notes ───────────────────────────────────────────────────────────── */
  const saveNotes = async () => { await updateField('notes', notesValue); setEditingNotes(false); };

  /* ── Upload file ──────────────────────────────────────────────────────────── */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTicket) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('accessToken') ?? sessionStorage.getItem('accessToken') ?? '';
      const res = await fetch(`/api/v1/quality/${selectedTicket.id}/attachments`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const updated: Ticket = await res.json();
      setSelectedTicket(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setToast({ message: 'File uploaded', type: 'success' });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Upload failed', type: 'error' });
    } finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  /* ── Remove attachment ────────────────────────────────────────────────────── */
  const removeAttachment = async (attachmentId: string) => {
    if (!selectedTicket) return;
    try {
      const updated = await api.delete<Ticket>(`/quality/${selectedTicket.id}/attachments/${attachmentId}`);
      setSelectedTicket(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setToast({ message: 'Removed', type: 'success' });
    } catch { setToast({ message: 'Failed to remove', type: 'error' }); }
  };

  /* ── Inline status change ─────────────────────────────────────────────────── */
  const updateTicketStatus = async (ticketId: string, status: string) => {
    setUpdatingId(ticketId);
    try {
      const updated = await api.patch<Ticket>(`/quality/${ticketId}`, { status });
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      if (selectedTicket?.id === ticketId) setSelectedTicket(updated);
      const fresh = await api.get<QualityResponse>('/quality');
      setCounts(fresh.counts);
    } catch (err) {
      setToast({ message: err instanceof ApiError ? err.message : 'Update failed', type: 'error' });
    } finally { setUpdatingId(null); }
  };

  /* ── Create ticket ────────────────────────────────────────────────────────── */
  const createTicket = async () => {
    if (!newTitle.trim() || !newAgent.trim()) { setToast({ message: 'Title and agent are required', type: 'error' }); return; }
    setCreating(true);
    try {
      await api.post('/quality', { conversationTitle: newTitle, agentName: newAgent, ticketType: newType, severity: newSeverity, notes: newNotes || undefined });
      setNewTitle(''); setNewAgent(''); setNewType('Incorrect Response'); setNewSeverity('medium'); setNewNotes('');
      setShowCreate(false);
      setToast({ message: 'Ticket created', type: 'success' });
      fetchTickets();
    } catch (err) {
      setToast({ message: err instanceof ApiError ? err.message : 'Create failed', type: 'error' });
    } finally { setCreating(false); }
  };

  const hasFilters = filterStatus || filterSeverity || filterType;

  /* ═══════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Detail slide-over ───────────────────────────────────────────────── */}
      {selectedTicket && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSelectedTicket(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l bg-card shadow-xl">
            {detailLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-card px-6 py-4">
              <button onClick={() => setSelectedTicket(null)} className="rounded-md p-1 hover:bg-muted"><ArrowLeft className="h-5 w-5" /></button>
              <div className="flex-1">
                <span className="font-mono text-sm font-bold">{selectedTicket.displayId}</span>
                <h2 className="text-lg font-semibold leading-tight">{selectedTicket.conversationTitle}</h2>
              </div>
            </div>

            <div className="space-y-6 p-6">
              {/* Badges section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Badges</p>
                  <div className="relative">
                    <button
                      onClick={() => setShowBadgePicker(!showBadgePicker)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-muted transition-colors"
                    >
                      <Tag className="h-3 w-3" /> Add / Edit
                    </button>
                    {showBadgePicker && (
                      <BadgePicker
                        currentBadges={selectedTicket.badges}
                        onUpdate={(badges) => updateBadges(selectedTicket.id, badges)}
                        onClose={() => setShowBadgePicker(false)}
                      />
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTicket.badges.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No badges</p>
                  ) : (
                    selectedTicket.badges.map((b, i) => (
                      <Badge
                        key={`${b.type}-${b.value}-${i}`}
                        value={b.value}
                        variant="soft"
                        removable
                        onRemove={() =>
                          updateBadges(
                            selectedTicket.id,
                            selectedTicket.badges.filter((_, j) => j !== i),
                          )
                        }
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Agent</p>
                  <p className="text-sm font-medium">{selectedTicket.agentName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Created</p>
                  <p className="text-sm">{formatDate(selectedTicket.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
                  <select value={selectedTicket.status} disabled={updatingId === selectedTicket.id} onChange={(e) => updateField('status', e.target.value)} className={cn(inputCls, 'w-full capitalize')}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Severity</p>
                  <select value={selectedTicket.severity} disabled={updatingId === selectedTicket.id} onChange={(e) => updateField('severity', e.target.value)} className={cn(inputCls, 'w-full capitalize')}>
                    {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Type</p>
                  <select value={selectedTicket.ticketType} disabled={updatingId === selectedTicket.id} onChange={(e) => updateField('ticketType', e.target.value)} className={cn(inputCls, 'w-full')}>
                    {TICKET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-muted-foreground">Notes</p>
                  {!editingNotes && <button onClick={() => setEditingNotes(true)} className="text-xs text-primary hover:underline">Edit</button>}
                </div>
                {editingNotes ? (
                  <div className="space-y-2">
                    <textarea value={notesValue} onChange={(e) => setNotesValue(e.target.value)} rows={4} className={cn(inputCls, 'h-auto py-2')} placeholder="Add notes..." />
                    <div className="flex gap-2">
                      <button onClick={saveNotes} disabled={updatingId === selectedTicket.id} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                        {updatingId === selectedTicket.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
                      </button>
                      <button onClick={() => { setEditingNotes(false); setNotesValue(selectedTicket.notes ?? ''); }} className="rounded-md px-3 py-1.5 text-xs font-medium hover:bg-muted">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedTicket.notes || 'No notes yet'}</p>
                )}
              </div>

              {/* Attachments */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Attachments ({selectedTicket.attachments.length})</p>
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />} {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx" />
                </div>
                {selectedTicket.attachments.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted p-6 text-center">
                    <Paperclip className="h-6 w-6 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No attachments</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedTicket.attachments.map((att) => (
                      <div key={att.id} className="flex items-center gap-3 rounded-lg border p-3">
                        {att.mimeType.startsWith('image/') ? (
                          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded border"><img src={att.url} alt={att.originalName} className="h-full w-full object-cover" /></div>
                        ) : (
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-muted"><FileText className="h-5 w-5 text-muted-foreground" /></div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{att.originalName}</p>
                          <p className="text-xs text-muted-foreground">{formatBytes(att.size)} &middot; {timeAgo(att.uploadedAt)}</p>
                        </div>
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="rounded-md p-1.5 hover:bg-muted" title="Download"><Download className="h-4 w-4 text-muted-foreground" /></a>
                        <button onClick={() => removeAttachment(att.id)} className="rounded-md p-1.5 hover:bg-red-50 text-muted-foreground hover:text-red-600" title="Remove"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Create modal ────────────────────────────────────────────────────── */}
      {showCreate && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">New Quality Ticket</h3>
                <button onClick={() => setShowCreate(false)} className="rounded-md p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1"><label className="text-sm font-medium">Conversation Title *</label><input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Cannot access billing portal" className={inputCls} /></div>
                <div className="space-y-1"><label className="text-sm font-medium">Agent Name *</label><input value={newAgent} onChange={(e) => setNewAgent(e.target.value)} placeholder="e.g. Alice Martinez" className={inputCls} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><label className="text-sm font-medium">Type</label><select value={newType} onChange={(e) => setNewType(e.target.value)} className={inputCls}>{TICKET_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
                  <div className="space-y-1"><label className="text-sm font-medium">Severity</label><select value={newSeverity} onChange={(e) => setNewSeverity(e.target.value)} className={inputCls}>{SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                </div>
                <div className="space-y-1"><label className="text-sm font-medium">Notes</label><textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={3} placeholder="Optional..." className={cn(inputCls, 'h-auto py-2')} /></div>
                <button onClick={createTicket} disabled={creating} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {creating ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quality Assurance</h1>
          <p className="text-muted-foreground">Review and track quality issues in conversations</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge value="open" variant="soft" /><span className="text-sm font-medium">{counts.open}</span>
          <Badge value="investigating" variant="soft" /><span className="text-sm font-medium">{counts.investigating}</span>
        </div>
      </div>

      {/* ── Search + filters ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)} placeholder="Search quality tickets..." className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className={cn('inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted', hasFilters && 'border-primary text-primary')}>
            <Filter className="h-4 w-4" /> Filters
            {hasFilters && <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">{[filterStatus, filterSeverity, filterType].filter(Boolean).length}</span>}
          </button>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> New Ticket</button>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={cn(inputCls, 'w-40')}><option value="">All Statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className={cn(inputCls, 'w-40')}><option value="">All Severities</option>{SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={cn(inputCls, 'w-48')}><option value="">All Types</option>{TICKET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          {hasFilters && <button onClick={() => { setFilterStatus(''); setFilterSeverity(''); setFilterType(''); }} className="text-sm text-muted-foreground hover:text-foreground">Clear all</button>}
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="rounded-lg border bg-card shadow-sm">
        {loading ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : tickets.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2"><CheckCircle2 className="h-8 w-8 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">No tickets found</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Conversation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Agent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Badges</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => openDetail(ticket)}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-mono font-medium">
                      {ticket.displayId}
                      {ticket.attachments.length > 0 && <Paperclip className="ml-1.5 inline h-3 w-3 text-muted-foreground" />}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">{ticket.conversationTitle}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">{ticket.agentName}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {ticket.badges.map((b, i) => (
                          <Badge key={`${b.type}-${b.value}-${i}`} value={b.value} variant="soft" showIcon />
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={ticket.status}
                        disabled={updatingId === ticket.id}
                        onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                        className={cn('appearance-none rounded-full px-3 py-0.5 text-xs font-medium capitalize cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1', updatingId === ticket.id && 'opacity-50',
                          ticket.status === 'open' && 'bg-red-50 text-red-700',
                          ticket.status === 'investigating' && 'bg-amber-50 text-amber-700',
                          ticket.status === 'resolved' && 'bg-emerald-50 text-emerald-700',
                        )}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">{timeAgo(ticket.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
