'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Plus, Trash2, LogIn, Users, MessageSquare,
  Search, X, Loader2, ChevronRight, UserPlus,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface Company {
  id: string; name: string; slug: string; logoUrl: string | null;
  website: string | null; plan: string; active: boolean;
  createdAt: string; updatedAt: string;
}

interface CompanyStats {
  user_count: number; conversation_count: number;
  active_conversations: number; message_count: number;
}

interface CompanyUser {
  id: string; email: string; name: string; avatarUrl: string | null;
  active: boolean; role: string; lastLoginAt: string | null; createdAt: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [detailTab, setDetailTab] = useState<'overview' | 'users'>('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [createName, setCreateName] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [addUserEmail, setAddUserEmail] = useState('');
  const [addUserName, setAddUserName] = useState('');
  const [addUserRole, setAddUserRole] = useState('agent');
  const [addUserPassword, setAddUserPassword] = useState('');

  const fetchCompanies = useCallback(async () => {
    try {
      const data = await api.get<Company[]>('/companies');
      setCompanies(Array.isArray(data) ? data : []);
    } catch { setCompanies([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  async function selectCompany(id: string) {
    setSelectedId(id);
    setDetailTab('overview');
    try {
      const [s, u] = await Promise.all([
        api.get<CompanyStats>(`/companies/${id}/stats`),
        api.get<CompanyUser[]>(`/companies/${id}/users`),
      ]);
      setStats(s); setUsers(u);
    } catch { setStats(null); setUsers([]); }
  }

  async function handleCreate() {
    if (!createName.trim()) return;
    setCreating(true);
    try {
      await api.post('/companies', { name: createName.trim(), slug: createSlug.trim() || createName.trim().toLowerCase().replace(/\s+/g, '-') });
      setShowCreateModal(false); setCreateName(''); setCreateSlug('');
      fetchCompanies();
    } catch {} finally { setCreating(false); }
  }

  async function handleDelete(id: string) {
    try { await api.delete(`/companies/${id}`); } catch {}
    setShowDeleteConfirm(null); setSelectedId(null); fetchCompanies();
  }

  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  async function handleAddUser() {
    if (!selectedId || !addUserEmail.trim() || !addUserName.trim()) return;
    try {
      const res = await api.post<{ success: boolean; userId: string; generatedPassword: string | null }>(`/companies/${selectedId}/users`, {
        email: addUserEmail.trim(), name: addUserName.trim(), role: addUserRole, password: addUserPassword || undefined,
      });
      if (res.generatedPassword) {
        setGeneratedPassword(res.generatedPassword);
      } else {
        setShowAddUserModal(false);
      }
      setAddUserEmail(''); setAddUserName(''); setAddUserRole('agent'); setAddUserPassword('');
      selectCompany(selectedId);
    } catch {}
  }

  async function handleChangeRole(userId: string, role: string) {
    if (!selectedId) return;
    try { await api.patch(`/companies/${selectedId}/users/${userId}/role`, { role }); selectCompany(selectedId); } catch {}
  }

  async function handleRemoveUser(userId: string) {
    if (!selectedId) return;
    try { await api.delete(`/companies/${selectedId}/users/${userId}`); selectCompany(selectedId); } catch {}
  }

  function startImpersonation(accessToken: string, refreshToken: string, userData: Record<string, unknown>, label: string) {
    // Save current admin session (tokens + user)
    const currentAccess = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    const currentRefresh = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
    const currentUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (currentAccess) localStorage.setItem('_admin_accessToken', currentAccess);
    if (currentRefresh) localStorage.setItem('_admin_refreshToken', currentRefresh);
    if (currentUser) localStorage.setItem('_admin_user', currentUser);

    // Set impersonated session - MUST include user JSON for auth context
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('impersonating', label);

    // Full page reload to reinitialize auth context
    window.location.href = '/dashboard';
  }

  async function handleImpersonate(companyId: string) {
    const company = companies.find((c) => c.id === companyId);
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string; companyId: string; role: string }>(`/companies/${companyId}/impersonate`);
      // Build a user object from current user + overridden company/role
      const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
      const impersonatedUser = { ...currentUser, companyId: res.companyId, role: res.role };
      startImpersonation(res.accessToken, res.refreshToken, impersonatedUser, company?.name ?? 'Company');
    } catch {}
  }

  async function handleImpersonateUser(companyId: string, userId: string) {
    const u = users.find((x) => x.id === userId);
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string; user: Record<string, unknown> }>(`/companies/${companyId}/users/${userId}/impersonate`);
      startImpersonation(res.accessToken, res.refreshToken, res.user, u?.name ?? 'User');
    } catch {}
  }

  const filtered = companies.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase()));
  const selected = companies.find((c) => c.id === selectedId);

  return (
    <div className="flex h-[calc(100vh-5rem)] overflow-hidden rounded-xl bg-card ring-1 ring-border/50">
      {/* ── List ── */}
      <div className={cn('flex w-full flex-col border-r border-border/50 md:w-[320px] md:shrink-0', selectedId && 'hidden md:flex')}>
        <div className="px-4 pt-4 pb-3 space-y-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /><h1 className="text-[15px] font-bold">Companies</h1></div>
            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-medium text-primary-foreground transition hover:bg-primary/90 active:scale-95"><Plus className="h-3 w-3" />Create</button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
            <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-full rounded-lg border border-border/50 bg-background pl-8 pr-3 text-[12px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          : filtered.length === 0 ? <div className="flex flex-col items-center py-16"><Building2 className="h-8 w-8 text-muted-foreground/20" /><p className="mt-2 text-[12px] text-muted-foreground">No companies</p></div>
          : <div className="p-2 space-y-0.5">{filtered.map((c) => (
            <button key={c.id} onClick={() => selectCompany(c.id)} className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition', selectedId === c.id ? 'bg-primary/[0.07]' : 'hover:bg-muted/50')}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary">{c.name[0]?.toUpperCase()}</div>
              <div className="min-w-0 flex-1"><p className="text-[12px] font-semibold truncate">{c.name}</p><p className="text-[10px] text-muted-foreground">{c.slug}</p></div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
            </button>
          ))}</div>}
        </div>
      </div>

      {/* ── Detail ── */}
      <div className={cn('flex flex-1 flex-col overflow-hidden', !selectedId && 'hidden md:flex')}>
        {!selectedId ? (
          <div className="flex flex-1 items-center justify-center"><div className="text-center"><Building2 className="mx-auto h-10 w-10 text-muted-foreground/20" /><p className="mt-2 text-[13px] text-muted-foreground">Select a company</p></div></div>
        ) : selected && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedId(null)} className="md:hidden rounded-lg p-1 hover:bg-muted"><ChevronRight className="h-4 w-4 rotate-180" /></button>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">{selected.name[0]}</div>
                <div><h2 className="text-[14px] font-bold">{selected.name}</h2><p className="text-[11px] text-muted-foreground">{selected.slug} &middot; {selected.plan}</p></div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => handleImpersonate(selected.id)} className="rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary transition hover:bg-primary/15 active:scale-95"><LogIn className="mr-1 inline h-3 w-3" />Enter as Admin</button>
                <button onClick={() => setShowDeleteConfirm(selected.id)} className="rounded-lg p-1.5 text-destructive transition hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>

            <div className="flex gap-px border-b border-border/50 px-5">
              {(['overview', 'users'] as const).map((tab) => (
                <button key={tab} onClick={() => setDetailTab(tab)} className={cn('px-3 py-2 text-[12px] font-medium capitalize border-b-2 -mb-px transition', detailTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>{tab}</button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {detailTab === 'overview' && stats && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[{ l: 'Users', v: stats.user_count }, { l: 'Conversations', v: stats.conversation_count }, { l: 'Active', v: stats.active_conversations }, { l: 'Messages', v: stats.message_count }].map((s) => (
                      <div key={s.l} className="rounded-xl border border-border/50 bg-background p-4"><p className="text-2xl font-bold">{s.v}</p><p className="text-[11px] text-muted-foreground">{s.l}</p></div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background p-4 space-y-2 text-[12px]">
                    <h3 className="font-semibold">Details</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-muted-foreground">ID:</span> <span className="font-mono text-[10px]">{selected.id.slice(0, 8)}...</span></div>
                      <div><span className="text-muted-foreground">Plan:</span> {selected.plan}</div>
                      <div><span className="text-muted-foreground">Created:</span> {new Date(selected.createdAt).toLocaleDateString()}</div>
                      <div><span className="text-muted-foreground">Website:</span> {selected.website ?? 'N/A'}</div>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'users' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-semibold text-muted-foreground">{users.length} user{users.length !== 1 ? 's' : ''}</p>
                    <button onClick={() => setShowAddUserModal(true)} className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-medium text-primary-foreground transition hover:bg-primary/90 active:scale-95"><UserPlus className="h-3 w-3" />Add User</button>
                  </div>
                  <div className="rounded-xl border border-border/50 overflow-hidden divide-y divide-border/50">
                    {users.map((u) => (
                      <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{u.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</div>
                        <div className="min-w-0 flex-1"><p className="text-[12px] font-medium truncate">{u.name}</p><p className="text-[10px] text-muted-foreground truncate">{u.email}</p></div>
                        <select value={u.role} onChange={(e) => handleChangeRole(u.id, e.target.value)} className="rounded-md border border-border/50 bg-background px-2 py-1 text-[10px] font-medium focus:outline-none focus:ring-1 focus:ring-primary/30">
                          <option value="super_admin">Server Admin</option><option value="admin">Company Admin</option><option value="manager">Manager</option><option value="agent">Agent</option>
                        </select>
                        <div className="flex gap-1">
                          <button onClick={() => handleImpersonateUser(selectedId!, u.id)} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground" title="Login as"><LogIn className="h-3 w-3" /></button>
                          <button onClick={() => handleRemoveUser(u.id)} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive" title="Remove"><X className="h-3 w-3" /></button>
                        </div>
                      </div>
                    ))}
                    {users.length === 0 && <div className="py-8 text-center"><p className="text-[12px] text-muted-foreground">No users</p></div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl ring-1 ring-border/50">
            <h2 className="text-[15px] font-bold mb-4">Create Company</h2>
            <div className="space-y-3">
              <div><label className="block text-[11px] font-semibold text-muted-foreground mb-1">Name *</label><input type="text" value={createName} onChange={(e) => { setCreateName(e.target.value); setCreateSlug(e.target.value.toLowerCase().replace(/\s+/g, '-')); }} className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/30" placeholder="Acme Corp" /></div>
              <div><label className="block text-[11px] font-semibold text-muted-foreground mb-1">Slug</label><input type="text" value={createSlug} onChange={(e) => setCreateSlug(e.target.value)} className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-[13px] font-mono focus:outline-none focus:ring-1 focus:ring-primary/30" placeholder="acme-corp" /></div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowCreateModal(false)} className="rounded-lg px-4 py-2 text-[12px] text-muted-foreground hover:bg-muted">Cancel</button>
              <button onClick={handleCreate} disabled={!createName.trim() || creating} className="rounded-lg bg-primary px-4 py-2 text-[12px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl ring-1 ring-border/50">
            {generatedPassword ? (
              <>
                <h2 className="text-[15px] font-bold mb-2">User Created</h2>
                <p className="text-[12px] text-muted-foreground mb-3">A password was auto-generated. Share it with the user so they can log in.</p>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 mb-4">
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 mb-1">Generated Password</p>
                  <p className="text-[14px] font-mono font-bold text-amber-900 dark:text-amber-100 select-all">{generatedPassword}</p>
                </div>
                <button onClick={() => { setGeneratedPassword(null); setShowAddUserModal(false); }} className="w-full rounded-lg bg-primary py-2 text-[12px] font-medium text-primary-foreground hover:bg-primary/90">Done</button>
              </>
            ) : (
              <>
                <h2 className="text-[15px] font-bold mb-4">Add User</h2>
                <div className="space-y-3">
                  <div><label className="block text-[11px] font-semibold text-muted-foreground mb-1">Name *</label><input type="text" value={addUserName} onChange={(e) => setAddUserName(e.target.value)} className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/30" placeholder="John Doe" /></div>
                  <div><label className="block text-[11px] font-semibold text-muted-foreground mb-1">Email *</label><input type="email" value={addUserEmail} onChange={(e) => setAddUserEmail(e.target.value)} className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/30" placeholder="john@company.com" /></div>
                  <div><label className="block text-[11px] font-semibold text-muted-foreground mb-1">Password <span className="font-normal text-muted-foreground/60">(auto-generated if empty)</span></label><input type="text" value={addUserPassword} onChange={(e) => setAddUserPassword(e.target.value)} className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/30" placeholder="Leave empty to auto-generate" /></div>
                  <div><label className="block text-[11px] font-semibold text-muted-foreground mb-1">Role</label><select value={addUserRole} onChange={(e) => setAddUserRole(e.target.value)} className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/30"><option value="admin">Company Admin</option><option value="manager">Manager</option><option value="agent">Agent</option></select></div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button onClick={() => { setShowAddUserModal(false); setGeneratedPassword(null); }} className="rounded-lg px-4 py-2 text-[12px] text-muted-foreground hover:bg-muted">Cancel</button>
                  <button onClick={handleAddUser} disabled={!addUserEmail.trim() || !addUserName.trim()} className="rounded-lg bg-primary px-4 py-2 text-[12px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Add User</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl ring-1 ring-border/50">
            <div className="flex items-center gap-3 mb-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div><div><h2 className="text-[14px] font-bold">Delete Company</h2><p className="text-[11px] text-muted-foreground">This action is permanent.</p></div></div>
            <p className="text-[12px] text-muted-foreground mb-4">All users, conversations, messages, and settings will be permanently deleted.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteConfirm(null)} className="rounded-lg px-4 py-2 text-[12px] text-muted-foreground hover:bg-muted">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="rounded-lg bg-destructive px-4 py-2 text-[12px] font-medium text-destructive-foreground hover:bg-destructive/90">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
