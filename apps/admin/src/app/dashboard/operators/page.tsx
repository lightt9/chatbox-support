'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Circle,
  Edit,
  UserX,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { OperatorModal } from './operator-modal';

interface OperatorStats {
  activeConversations: number;
  resolvedToday: number;
  avgRating: number;
}

interface Operator {
  id: string;
  companyId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  phone: string | null;
  timezone: string | null;
  language: string | null;
  maxConcurrentChats: number;
  skills: string[];
  languages: string[];
  active: boolean;
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
  stats: OperatorStats;
}

interface OperatorsResponse {
  data: Operator[];
  meta: { total: number; page: number; limit: number };
}

const statusColors: Record<string, string> = {
  online: 'text-green-500',
  away: 'text-amber-500',
  busy: 'text-red-500',
  offline: 'text-gray-400',
};

const statusBgColors: Record<string, string> = {
  online: 'bg-green-500',
  away: 'bg-amber-500',
  busy: 'bg-red-500',
  offline: 'bg-gray-400',
};

const roleBadgeColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300',
  manager: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  agent: 'bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-300',
};

export default function OperatorsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const limit = 12;

  const canManage = user?.role === 'super_admin' || user?.role === 'admin';

  const fetchOperators = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);

      const res = await api.get<OperatorsResponse>(`/operators?${params}`);
      setOperators(res.data);
      setTotal(res.meta.total);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load operators';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleDeactivate = async (operator: Operator) => {
    if (!confirm(`Are you sure you want to deactivate ${operator.name}?`)) return;
    try {
      await api.delete(`/operators/${operator.id}`);
      setToast({ message: `${operator.name} has been deactivated`, type: 'success' });
      setActionMenuId(null);
      fetchOperators();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate operator';
      setToast({ message, type: 'error' });
    }
  };

  const handleSave = () => {
    setShowModal(false);
    setEditingOperator(null);
    fetchOperators();
  };

  const totalPages = Math.ceil(total / limit);

  // Debounce search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div className="space-y-6 p-1">
      {/* Toast notification */}
      {toast && (
        <div
          className={cn(
            'fixed right-4 top-4 z-[100] flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all',
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          )}
          style={{ boxShadow: 'var(--shadow-xl)' }}
        >
          {toast.message}
          <button onClick={() => setToast(null)} className="cursor-pointer rounded-lg p-0.5 hover:bg-white/20 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Operators</h1>
          <p className="text-muted-foreground">
            Manage support agents and their assignments
            {total > 0 && <span className="ml-1">({total} total)</span>}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setEditingOperator(null);
              setShowModal(true);
            }}
            className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Operator
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'cursor-pointer inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
            showFilters || roleFilter || statusFilter
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-input hover:bg-muted/50'
          )}
        >
          <Filter className="h-4 w-4" />
          Filters
          {(roleFilter || statusFilter) && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {(roleFilter ? 1 : 0) + (statusFilter ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Filter pills */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/40 bg-card p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="h-9 cursor-pointer rounded-lg border border-input bg-background px-3 text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/10 focus:outline-none"
            >
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="agent">Agent</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-9 cursor-pointer rounded-lg border border-input bg-background px-3 text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/10 focus:outline-none"
            >
              <option value="">All statuses</option>
              <option value="online">Online</option>
              <option value="away">Away</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
            </select>
          </div>
          {(roleFilter || statusFilter) && (
            <button
              onClick={() => { setRoleFilter(''); setStatusFilter(''); setPage(1); }}
              className="mt-5 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border/40 bg-card p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="space-y-2">
                  <div className="h-4 w-24 rounded-lg bg-muted" />
                  <div className="h-3 w-16 rounded-lg bg-muted" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 pt-4" style={{ borderTop: '1px solid hsl(var(--border) / 0.25)' }}>
                <div className="h-10 rounded-lg bg-muted" />
                <div className="h-10 rounded-lg bg-muted" />
                <div className="h-10 rounded-lg bg-muted" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={fetchOperators}
            className="cursor-pointer mt-2 text-sm font-medium text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && operators.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card p-12">
          <Users className="h-12 w-12 text-muted-foreground/60" />
          <h3 className="mt-4 text-lg font-semibold">No operators found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || roleFilter || statusFilter
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first operator'}
          </p>
          {canManage && !search && !roleFilter && !statusFilter && (
            <button
              onClick={() => setShowModal(true)}
              className="cursor-pointer mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Operator
            </button>
          )}
        </div>
      )}

      {/* Operator cards */}
      {!loading && !error && operators.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {operators.map((operator) => (
            <div
              key={operator.id}
              onClick={() => router.push(`/dashboard/operators/${operator.id}`)}
              className={cn(
                'group relative cursor-pointer rounded-xl border border-border/40 bg-card p-6 transition-all duration-200 hover:border-primary/30 hover:-translate-y-0.5',
                !operator.active && 'opacity-60'
              )}
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {operator.avatarUrl ? (
                      <img
                        src={operator.avatarUrl}
                        alt={operator.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {operator.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                    )}
                    <div
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card',
                        statusBgColors[operator.status] ?? 'bg-gray-400'
                      )}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                      {operator.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {operator.email}
                    </p>
                  </div>
                </div>

                {canManage && (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionMenuId(actionMenuId === operator.id ? null : operator.id);
                      }}
                      className="cursor-pointer rounded-lg p-1 hover:bg-muted/50 transition-colors duration-150"
                    >
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </button>

                    {actionMenuId === operator.id && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuId(null);
                          }}
                        />
                        <div className="absolute right-0 z-50 mt-1 w-40 rounded-xl border border-border/40 bg-card py-1" style={{ boxShadow: 'var(--shadow-xl)' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingOperator(operator);
                              setShowModal(true);
                              setActionMenuId(null);
                            }}
                            className="cursor-pointer flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/30 transition-colors duration-150"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </button>
                          {operator.active && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeactivate(operator);
                              }}
                              className="cursor-pointer flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted/30 transition-colors duration-150"
                            >
                              <UserX className="h-4 w-4" />
                              Deactivate
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Role badge + status */}
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                    roleBadgeColors[operator.role] ?? roleBadgeColors.agent
                  )}
                >
                  {operator.role}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                  <Circle
                    className={cn(
                      'h-2 w-2 fill-current',
                      statusColors[operator.status] ?? 'text-gray-400'
                    )}
                  />
                  {operator.status}
                </span>
                {!operator.active && (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300">
                    Inactive
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-3 gap-2 pt-4" style={{ borderTop: '1px solid hsl(var(--border) / 0.25)' }}>
                <div className="text-center">
                  <p className="text-lg font-bold">{operator.stats.activeConversations}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{operator.stats.resolvedToday}</p>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">
                    {operator.stats.avgRating > 0 ? operator.stats.avgRating.toFixed(1) : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">Rating</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-5" style={{ borderTop: '1px solid hsl(var(--border) / 0.25)' }}>
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-border/40 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-muted/30 transition-colors duration-150"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-border/40 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-muted/30 transition-colors duration-150"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <OperatorModal
          operator={editingOperator}
          onClose={() => { setShowModal(false); setEditingOperator(null); }}
          onSave={handleSave}
          onToast={setToast}
        />
      )}
    </div>
  );
}
