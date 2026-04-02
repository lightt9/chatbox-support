'use client';

import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface Team {
  id: string;
  name: string;
}

interface Operator {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  phone: string | null;
  timezone: string | null;
  language: string | null;
  notes?: string | null;
  maxConcurrentChats: number;
  skills: string[];
  languages: string[];
  active: boolean;
  teams?: Team[];
}

interface OperatorModalProps {
  operator: Operator | null;
  onClose: () => void;
  onSave: () => void;
  onToast: (toast: { message: string; type: 'success' | 'error' }) => void;
}

const TIMEZONES = [
  'UTC',
  'Europe/Bucharest',
  'Europe/Moscow',
  'Europe/London',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

export function OperatorModal({ operator, onClose, onSave, onToast }: OperatorModalProps) {
  const isEdit = !!operator;
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: operator?.name ?? '',
    email: operator?.email ?? '',
    password: '',
    role: operator?.role ?? 'agent',
    phone: operator?.phone ?? '',
    timezone: operator?.timezone ?? 'UTC',
    language: operator?.language ?? 'en',
    notes: operator?.notes ?? '',
    maxConcurrentChats: operator?.maxConcurrentChats ?? 5,
    active: operator?.active ?? true,
    teamIds: [] as string[],
  });

  useEffect(() => {
    // Fetch available teams
    api.get<Team[]>('/operators/teams').then(setTeams).catch(() => {});

    // If editing, fetch full details to get teams
    if (operator?.id) {
      api.get<Operator & { teams: Team[] }>(`/operators/${operator.id}`).then((data) => {
        if (data.teams) {
          setForm((prev) => ({ ...prev, teamIds: data.teams.map((t) => t.id) }));
        }
        if (data.notes !== undefined) {
          setForm((prev) => ({ ...prev, notes: data.notes ?? '' }));
        }
      }).catch(() => {});
    }
  }, [operator?.id]);

  const updateField = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!isEdit && !form.password) newErrors.password = 'Password is required';
    if (form.password && form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role: form.role,
        phone: form.phone || undefined,
        timezone: form.timezone,
        language: form.language,
        notes: form.notes || undefined,
        maxConcurrentChats: form.maxConcurrentChats,
        active: form.active,
        teamIds: form.teamIds,
      };

      if (form.password) {
        payload.password = form.password;
      }

      if (isEdit) {
        await api.patch(`/operators/${operator.id}`, payload);
        onToast({ message: `${form.name} updated successfully`, type: 'success' });
      } else {
        payload.password = form.password;
        await api.post('/operators', payload);
        onToast({ message: `${form.name} created successfully`, type: 'success' });
      }

      onSave();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save operator';
      onToast({ message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleTeam = (teamId: string) => {
    setForm((prev) => ({
      ...prev,
      teamIds: prev.teamIds.includes(teamId)
        ? prev.teamIds.filter((id) => id !== teamId)
        : [...prev.teamIds, teamId],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border bg-card shadow-2xl mx-4">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-6 py-4 rounded-t-xl">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit Operator' : 'Add Operator'}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name & Email */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Full Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={cn(
                  'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
                  errors.name && 'border-destructive'
                )}
                placeholder="John Doe"
              />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Email <span className="text-destructive">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={cn(
                  'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
                  errors.email && 'border-destructive'
                )}
                placeholder="john@company.com"
              />
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Password {!isEdit && <span className="text-destructive">*</span>}
              {isEdit && <span className="text-xs text-muted-foreground ml-1">(leave blank to keep current)</span>}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                className={cn(
                  'flex h-10 w-full rounded-md border bg-background px-3 pr-10 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
                  errors.password && 'border-destructive'
                )}
                placeholder="Min. 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password}</p>}
          </div>

          {/* Role & Status */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Role</label>
              <select
                value={form.role}
                onChange={(e) => updateField('role', e.target.value)}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="agent">Agent</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Status</label>
              <div className="flex items-center gap-3 h-10">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => updateField('active', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Active
                </label>
              </div>
            </div>
          </div>

          {/* Phone & Timezone */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="+40 7XX XXX XXX"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Timezone</label>
              <select
                value={form.timezone}
                onChange={(e) => updateField('timezone', e.target.value)}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Language & Max Chats */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Language</label>
              <select
                value={form.language}
                onChange={(e) => updateField('language', e.target.value)}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="en">English</option>
                <option value="ro">Romanian</option>
                <option value="ru">Russian</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Max Concurrent Chats</label>
              <input
                type="number"
                value={form.maxConcurrentChats}
                onChange={(e) => updateField('maxConcurrentChats', parseInt(e.target.value) || 5)}
                min={1}
                max={20}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Teams */}
          {teams.length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">Teams</label>
              <div className="flex flex-wrap gap-2">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => toggleTeam(team.id)}
                    className={cn(
                      'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                      form.teamIds.includes(team.id)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-input hover:bg-muted'
                    )}
                  >
                    {team.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Internal Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
              className="flex w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Internal notes about this operator..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Operator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
