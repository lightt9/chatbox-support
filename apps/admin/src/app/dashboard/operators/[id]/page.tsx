'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Circle,
  Mail,
  Phone,
  Globe,
  Clock,
  MessageSquare,
  CheckCircle2,
  Star,
  Calendar,
  Edit,
  UserX,
  Activity,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { OperatorModal } from '../operator-modal';

interface Team {
  id: string;
  name: string;
}

interface OperatorStats {
  activeConversations: number;
  resolvedToday: number;
  avgRating: number;
}

interface OperatorDetail {
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
  notes: string | null;
  maxConcurrentChats: number;
  skills: string[];
  languages: string[];
  active: boolean;
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
  teams: Team[];
  stats: OperatorStats;
}

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  away: 'bg-amber-500',
  busy: 'bg-red-500',
  offline: 'bg-gray-400',
};

const roleBadgeColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  agent: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  admin: {
    'Manage Operators': true,
    'Access Settings': true,
    'View Reports': true,
    'Manage Billing': true,
    'Full CRUD': true,
    'Manage Conversations': true,
    'Manage Leads': true,
    'Knowledge Base Edit': true,
  },
  manager: {
    'Manage Operators': true,
    'Access Settings': false,
    'View Reports': true,
    'Manage Billing': false,
    'Full CRUD': false,
    'Manage Conversations': true,
    'Manage Leads': true,
    'Knowledge Base Edit': true,
  },
  agent: {
    'Manage Operators': false,
    'Access Settings': false,
    'View Reports': false,
    'Manage Billing': false,
    'Full CRUD': false,
    'Manage Conversations': true,
    'Manage Leads': false,
    'Knowledge Base Edit': false,
  },
};

type TabKey = 'overview' | 'conversations' | 'performance' | 'permissions';

export default function OperatorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [operator, setOperator] = useState<OperatorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const canManage = user?.role === 'super_admin' || user?.role === 'admin';
  const operatorId = params.id as string;

  const fetchOperator = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<OperatorDetail>(`/operators/${operatorId}`);
      setOperator(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load operator';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [operatorId]);

  useEffect(() => {
    fetchOperator();
  }, [fetchOperator]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleDeactivate = async () => {
    if (!operator) return;
    if (!confirm(`Are you sure you want to deactivate ${operator.name}?`)) return;
    try {
      await api.delete(`/operators/${operator.id}`);
      setToast({ message: `${operator.name} has been deactivated`, type: 'success' });
      fetchOperator();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate';
      setToast({ message, type: 'error' });
    }
  };

  const tabs: { key: TabKey; label: string; icon: typeof Activity }[] = [
    { key: 'overview', label: 'Overview', icon: Activity },
    { key: 'conversations', label: 'Conversations', icon: MessageSquare },
    { key: 'performance', label: 'Performance', icon: Star },
    { key: 'permissions', label: 'Permissions', icon: Shield },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded bg-muted" />
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (error || !operator) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push('/dashboard/operators')}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Operators
        </button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">{error ?? 'Operator not found'}</p>
        </div>
      </div>
    );
  }

  const permissions = ROLE_PERMISSIONS[operator.role] ?? ROLE_PERMISSIONS.agent;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={cn(
            'fixed right-4 top-4 z-[100] flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg',
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          )}
        >
          {toast.message}
          <button onClick={() => setToast(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Back button */}
      <button
        onClick={() => router.push('/dashboard/operators')}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Operators
      </button>

      {/* Profile Header */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              {operator.avatarUrl ? (
                <img
                  src={operator.avatarUrl}
                  alt={operator.name}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-lg font-bold">
                  {operator.name.split(' ').map((n) => n[0]).join('')}
                </div>
              )}
              <div
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card',
                  statusColors[operator.status] ?? 'bg-gray-400'
                )}
              />
            </div>
            <div>
              <h1 className="text-xl font-bold">{operator.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                    roleBadgeColors[operator.role] ?? roleBadgeColors.agent
                  )}
                >
                  {operator.role}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
                  <Circle className={cn('h-2 w-2 fill-current', operator.status === 'online' ? 'text-green-500' : operator.status === 'away' ? 'text-amber-500' : operator.status === 'busy' ? 'text-red-500' : 'text-gray-400')} />
                  {operator.status}
                </span>
                {!operator.active && (
                  <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    Inactive
                  </span>
                )}
              </div>
            </div>
          </div>

          {canManage && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                <Edit className="h-4 w-4" />
                Edit
              </button>
              {operator.active && (
                <button
                  onClick={handleDeactivate}
                  className="inline-flex items-center gap-2 rounded-md border border-destructive/50 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <UserX className="h-4 w-4" />
                  Deactivate
                </button>
              )}
            </div>
          )}
        </div>

        {/* Contact info */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Mail className="h-4 w-4" />
            {operator.email}
          </span>
          {operator.phone && (
            <span className="flex items-center gap-1.5">
              <Phone className="h-4 w-4" />
              {operator.phone}
            </span>
          )}
          {operator.timezone && (
            <span className="flex items-center gap-1.5">
              <Globe className="h-4 w-4" />
              {operator.timezone}
            </span>
          )}
          {operator.lastActiveAt && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Last active: {new Date(operator.lastActiveAt).toLocaleString()}
            </span>
          )}
        </div>

        {/* Teams */}
        {operator.teams.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-wrap gap-1.5">
              {operator.teams.map((team) => (
                <span
                  key={team.id}
                  className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
                >
                  {team.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            Active Conversations
          </div>
          <p className="mt-2 text-2xl font-bold">{operator.stats.activeConversations}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            Resolved Today
          </div>
          <p className="mt-2 text-2xl font-bold">{operator.stats.resolvedToday}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Star className="h-4 w-4" />
            Avg Rating
          </div>
          <p className="mt-2 text-2xl font-bold">
            {operator.stats.avgRating > 0 ? operator.stats.avgRating.toFixed(1) : '—'}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Joined
          </div>
          <p className="mt-2 text-2xl font-bold">
            {new Date(operator.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="min-h-[300px]">
        {activeTab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Details */}
            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Details</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Language</dt>
                  <dd className="text-sm font-medium uppercase">{operator.language ?? 'en'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Max Concurrent Chats</dt>
                  <dd className="text-sm font-medium">{operator.maxConcurrentChats}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Created</dt>
                  <dd className="text-sm font-medium">{new Date(operator.createdAt).toLocaleDateString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Updated</dt>
                  <dd className="text-sm font-medium">{new Date(operator.updatedAt).toLocaleDateString()}</dd>
                </div>
              </dl>
            </div>

            {/* Skills */}
            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Skills & Languages</h3>
              {(operator.skills as string[]).length > 0 ? (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(operator.skills as string[]).map((skill) => (
                      <span key={skill} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">{skill}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mb-4 text-sm text-muted-foreground">No skills specified</p>
              )}
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Languages</p>
                <div className="flex flex-wrap gap-1.5">
                  {(operator.languages as string[]).map((lang) => (
                    <span key={lang} className="rounded-full bg-muted px-2.5 py-0.5 text-xs uppercase">{lang}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            {operator.notes && (
              <div className="rounded-lg border bg-card p-6 lg:col-span-2">
                <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Internal Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{operator.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'conversations' && (
          <div className="rounded-lg border bg-card p-8 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Conversation History</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {operator.stats.activeConversations} active conversations assigned to this operator.
              Visit the Conversations page to view details.
            </p>
            <button
              onClick={() => router.push('/dashboard/conversations')}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              View Conversations
            </button>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Today&apos;s Performance</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Active Conversations</span>
                    <span className="font-bold">{operator.stats.activeConversations}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min((operator.stats.activeConversations / operator.maxConcurrentChats) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {operator.stats.activeConversations} / {operator.maxConcurrentChats} capacity
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Resolved Today</span>
                    <span className="font-bold">{operator.stats.resolvedToday}</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Customer Satisfaction</span>
                    <span className="font-bold">
                      {operator.stats.avgRating > 0 ? `${operator.stats.avgRating.toFixed(1)} / 5` : 'No data'}
                    </span>
                  </div>
                  {operator.stats.avgRating > 0 && (
                    <div className="mt-2 flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            'h-4 w-4',
                            star <= Math.round(operator.stats.avgRating)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-muted'
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Workload</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                    operator.status === 'online' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                    operator.status === 'away' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                    operator.status === 'busy' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  )}>
                    {operator.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Max Capacity</span>
                  <span className="font-medium">{operator.maxConcurrentChats} chats</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Utilization</span>
                  <span className="font-medium">
                    {operator.maxConcurrentChats > 0
                      ? Math.round((operator.stats.activeConversations / operator.maxConcurrentChats) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-1 text-sm font-semibold uppercase text-muted-foreground">
              Role-Based Permissions
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Permissions for the <span className="font-medium capitalize">{operator.role}</span> role
            </p>
            <div className="divide-y">
              {Object.entries(permissions).map(([key, allowed]) => (
                <div key={key} className="flex items-center justify-between py-3">
                  <span className="text-sm">{key}</span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                      allowed
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    )}
                  >
                    {allowed ? 'Allowed' : 'Denied'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <OperatorModal
          operator={operator}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            setShowEditModal(false);
            fetchOperator();
          }}
          onToast={setToast}
        />
      )}
    </div>
  );
}
