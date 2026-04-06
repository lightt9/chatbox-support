'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Download, Calendar, TrendingUp, TrendingDown, Users,
  MessageSquare, Clock, Loader2, Bot, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '../../../lib/api';
import { Toast } from '../../../components/ui/Toast';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

/* ── Types ──────────────────────────────────────────────────────────────────── */

interface KPI { value: number; change: number }
interface Overview { totalConversations: KPI; avgResolutionTime: KPI; csatScore: KPI; aiResolutionRate: KPI }
interface VolumeDay { date: string; total: number; resolved: number; open: number; escalated: number }
interface AgentPerf { agent: string; totalConversations: number; resolved: number; avgResolutionMin: number; avgFirstResponseMin: number; avgCsat: number }
interface ResponseTimeDay { date: string; avgFirstResponseMin: number; avgResolutionMin: number }
interface CsatDay { date: string; avgScore: number; totalRatings: number; positive: number; negative: number }
interface ChannelData { channel: string; total: number; resolved: number }
interface RecentConv { id: string; customerName: string; subject: string; agent: string; channel: string; status: string; resolvedBy: string; durationMin: number; createdAt: string }

/* ── Date presets ───────────────────────────────────────────────────────────── */

const PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function fmtMin(m: number) { return m < 60 ? `${m}m` : `${(m / 60).toFixed(1)}h`; }

const COLORS = ['hsl(221, 83%, 53%)', 'hsl(142, 76%, 36%)', 'hsl(24, 95%, 53%)', 'hsl(262, 83%, 58%)', 'hsl(0, 84%, 60%)'];
const channelLabels: Record<string, string> = { web_chat: 'Web Chat', email: 'Email', whatsapp: 'WhatsApp', telegram: 'Telegram', sms: 'SMS' };

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30);
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [volume, setVolume] = useState<VolumeDay[]>([]);
  const [agents, setAgents] = useState<AgentPerf[]>([]);
  const [responseTimes, setResponseTimes] = useState<ResponseTimeDay[]>([]);
  const [csat, setCsat] = useState<CsatDay[]>([]);
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [recent, setRecent] = useState<RecentConv[]>([]);

  const getDateParams = useCallback(() => {
    const to = new Date().toISOString();
    const from = new Date(Date.now() - dateRange * 86400000).toISOString();
    return `from=${from}&to=${to}`;
  }, [dateRange]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const qs = getDateParams();
    try {
      const [ov, vol, ag, rt, cs, ch, rc] = await Promise.all([
        api.get<Overview>(`/reports/overview?${qs}`),
        api.get<VolumeDay[]>(`/reports/conversations?${qs}`),
        api.get<AgentPerf[]>(`/reports/agents?${qs}`),
        api.get<ResponseTimeDay[]>(`/reports/response-times?${qs}`),
        api.get<CsatDay[]>(`/reports/csat?${qs}`),
        api.get<ChannelData[]>(`/reports/channels?${qs}`),
        api.get<RecentConv[]>(`/reports/recent?${qs}`),
      ]);
      setOverview(ov); setVolume(vol); setAgents(ag); setResponseTimes(rt); setCsat(cs); setChannels(ch); setRecent(rc);
    } catch { setToast({ message: 'Failed to load reports', type: 'error' }); }
    finally { setLoading(false); }
  }, [getDateParams]);

  useEffect(() => { fetchAll(); }, [dateRange]); // eslint-disable-line

  const handleExport = async (format: string) => {
    const qs = getDateParams();
    const token = localStorage.getItem('accessToken') ?? sessionStorage.getItem('accessToken') ?? '';
    const res = await fetch(`/api/v1/reports/export?${qs}&format=${format}`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `report.${format}`; a.click();
    URL.revokeObjectURL(url);
    setToast({ message: `Exported as ${format.toUpperCase()}`, type: 'success' });
  };

  /* ── KPI Card ─────────────────────────────────────────────────────────────── */
  const KpiCard = ({ title, value, unit, change, icon: Icon }: { title: string; value: string; unit?: string; change: number; icon: any }) => (
    <div className="rounded-xl border border-border/40 bg-card p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{title}</p>
        <Icon className="h-5 w-5 text-muted-foreground/50" />
      </div>
      <p className="mt-2 text-3xl font-bold">{value}{unit && <span className="text-lg font-normal text-muted-foreground">{unit}</span>}</p>
      <div className="mt-1 flex items-center gap-1">
        {change >= 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
        <span className={cn('text-sm font-medium', change >= 0 ? 'text-green-600' : 'text-red-600')}>
          {change >= 0 ? '+' : ''}{change}{typeof change === 'number' && Number.isInteger(change) ? '%' : ''}
        </span>
        <span className="text-sm text-muted-foreground">vs previous period</span>
      </div>
    </div>
  );

  const statusColors: Record<string, string> = { resolved: 'text-emerald-600', open: 'text-amber-600', escalated: 'text-red-600' };

  if (loading && !overview) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-7">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Analytics and reporting for your support operations</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowDateMenu(!showDateMenu)} className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted/40 cursor-pointer transition-colors duration-150">
              <Calendar className="h-4 w-4" /> Last {dateRange} days <ChevronDown className="h-3 w-3" />
            </button>
            {showDateMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDateMenu(false)} />
                <div className="absolute right-0 z-50 mt-1 w-40 rounded-xl border border-border/40 bg-card py-1" style={{ boxShadow: 'var(--shadow-lg)' }}>
                  {PRESETS.map(p => (
                    <button key={p.days} onClick={() => { setDateRange(p.days); setShowDateMenu(false); }}
                      className={cn('block w-full px-4 py-2 text-left text-sm hover:bg-muted/40 cursor-pointer transition-colors duration-150', dateRange === p.days && 'font-semibold text-primary')}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="relative">
            <button onClick={() => handleExport('csv')} className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted/40 cursor-pointer transition-colors duration-150">
              <Download className="h-4 w-4" /> CSV
            </button>
          </div>
          <button onClick={() => handleExport('json')} className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted/40 cursor-pointer transition-colors duration-150">
            <Download className="h-4 w-4" /> JSON
          </button>
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────────────── */}
      {overview && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard title="Total Conversations" value={overview.totalConversations.value.toLocaleString()} change={overview.totalConversations.change} icon={MessageSquare} />
          <KpiCard title="Avg Resolution Time" value={`${overview.avgResolutionTime.value}`} unit="h" change={overview.avgResolutionTime.change} icon={Clock} />
          <KpiCard title="CSAT Score" value={`${overview.csatScore.value}`} unit="/5" change={overview.csatScore.change} icon={TrendingUp} />
          <KpiCard title="AI Resolution Rate" value={`${overview.aiResolutionRate.value}`} unit="%" change={overview.aiResolutionRate.change} icon={Bot} />
        </div>
      )}

      {/* ── Charts Row 1 ────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Conversation Volume */}
        <div className="rounded-xl border border-border/40 bg-card p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="font-semibold">Conversation Volume</h3>
          <p className="text-sm text-muted-foreground">Daily conversations over time</p>
          <div className="mt-4 h-64">
            {volume.length === 0 ? <EmptyState message="No conversation data for this period" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volume}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tickFormatter={fmtDate} className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip labelFormatter={fmtDate} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.5)', borderRadius: '0.75rem', color: 'hsl(var(--foreground))', fontSize: '0.8125rem', padding: '8px 12px', boxShadow: 'var(--shadow-lg)' }} />
                <Legend />
                <Area type="monotone" dataKey="resolved" stackId="1" fill="hsl(142, 76%, 36%)" stroke="hsl(142, 76%, 36%)" fillOpacity={0.3} name="Resolved" />
                <Area type="monotone" dataKey="open" stackId="1" fill="hsl(38, 92%, 50%)" stroke="hsl(38, 92%, 50%)" fillOpacity={0.3} name="Open" />
                <Area type="monotone" dataKey="escalated" stackId="1" fill="hsl(0, 84%, 60%)" stroke="hsl(0, 84%, 60%)" fillOpacity={0.3} name="Escalated" />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Agent Performance */}
        <div className="rounded-xl border border-border/40 bg-card p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="font-semibold">Agent Performance</h3>
          <p className="text-sm text-muted-foreground">Conversations handled per agent</p>
          <div className="mt-4 h-64">
            {agents.length === 0 ? <EmptyState message="No agent data for this period" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agents} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis dataKey="agent" type="category" width={100} className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.5)', borderRadius: '0.75rem', color: 'hsl(var(--foreground))', fontSize: '0.8125rem', padding: '8px 12px', boxShadow: 'var(--shadow-lg)' }} />
                <Legend />
                <Bar dataKey="resolved" fill="hsl(142, 76%, 36%)" name="Resolved" radius={[0, 4, 4, 0]} />
                <Bar dataKey="totalConversations" fill="hsl(221, 83%, 53%)" name="Total" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Charts Row 2 ────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Response Times */}
        <div className="rounded-xl border border-border/40 bg-card p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="font-semibold">Response Times</h3>
          <p className="text-sm text-muted-foreground">Average first response and resolution times (minutes)</p>
          <div className="mt-4 h-64">
            {responseTimes.length === 0 ? <EmptyState message="No response time data for this period" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={responseTimes}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tickFormatter={fmtDate} className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip labelFormatter={fmtDate} formatter={(v: number) => fmtMin(v)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.5)', borderRadius: '0.75rem', color: 'hsl(var(--foreground))', fontSize: '0.8125rem', padding: '8px 12px', boxShadow: 'var(--shadow-lg)' }} />
                <Legend />
                <Line type="monotone" dataKey="avgFirstResponseMin" stroke="hsl(221, 83%, 53%)" name="First Response" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="avgResolutionMin" stroke="hsl(262, 83%, 58%)" name="Resolution" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CSAT */}
        <div className="rounded-xl border border-border/40 bg-card p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="font-semibold">Customer Satisfaction</h3>
          <p className="text-sm text-muted-foreground">CSAT score over time</p>
          <div className="mt-4 h-64">
            {csat.length === 0 ? <EmptyState message="No satisfaction data for this period" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={csat}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tickFormatter={fmtDate} className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis domain={[1, 5]} className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip labelFormatter={fmtDate} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.5)', borderRadius: '0.75rem', color: 'hsl(var(--foreground))', fontSize: '0.8125rem', padding: '8px 12px', boxShadow: 'var(--shadow-lg)' }} />
                <Area type="monotone" dataKey="avgScore" fill="hsl(38, 92%, 50%)" stroke="hsl(38, 92%, 50%)" fillOpacity={0.2} name="Avg Score" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Channel Breakdown + Agent Table ──────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Channel Pie */}
        <div className="rounded-xl border border-border/40 bg-card p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="font-semibold">Channel Breakdown</h3>
          <p className="text-sm text-muted-foreground">Conversations by channel</p>
          <div className="mt-4 h-64">
            {channels.length === 0 ? <EmptyState message="No channel data for this period" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={channels} dataKey="total" nameKey="channel" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }: any) => `${channelLabels[name] ?? name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {channels.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number, name: string) => [v, channelLabels[name] ?? name]} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.5)', borderRadius: '0.75rem', color: 'hsl(var(--foreground))', fontSize: '0.8125rem', padding: '8px 12px', boxShadow: 'var(--shadow-lg)' }} />
              </PieChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Agent Table */}
        <div className="lg:col-span-2 rounded-xl border border-border/40 bg-card" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="p-6 pb-3">
            <h3 className="font-semibold">Agent Leaderboard</h3>
            <p className="text-sm text-muted-foreground">Performance breakdown per agent</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50" style={{ borderBottom: '1px solid hsl(var(--border) / 0.25)' }}>
                  <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Agent</th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Convs</th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Resolved</th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Avg Resolution</th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">1st Response</th>
                  <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">CSAT</th>
                </tr>
              </thead>
              <tbody>
                {agents.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">No agent data for this period</td></tr>
                ) : agents.map(a => (
                  <tr key={a.agent} className="hover:bg-muted/30 transition-colors duration-150" style={{ borderBottom: '1px solid hsl(var(--border) / 0.25)' }}>
                    <td className="whitespace-nowrap px-6 py-3 text-sm font-medium">{a.agent}</td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm">{a.totalConversations}</td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm">{a.resolved}</td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm">{fmtMin(a.avgResolutionMin)}</td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm">{fmtMin(a.avgFirstResponseMin)}</td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm">
                      <span className={cn('font-medium', a.avgCsat >= 4 ? 'text-green-600' : a.avgCsat >= 3 ? 'text-amber-600' : 'text-red-600')}>
                        {a.avgCsat.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Recent Conversations ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border/40 bg-card" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="p-6 pb-3">
          <h3 className="font-semibold">Recent Conversations</h3>
          <p className="text-sm text-muted-foreground">Latest 50 conversations in the selected period</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50" style={{ borderBottom: '1px solid hsl(var(--border) / 0.25)' }}>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Customer</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Subject</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Agent</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Channel</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Duration</th>
                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-muted-foreground">No conversations for this period</td></tr>
              ) : recent.map(c => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors duration-150" style={{ borderBottom: '1px solid hsl(var(--border) / 0.25)' }}>
                  <td className="whitespace-nowrap px-6 py-3 text-sm font-medium">{c.customerName}</td>
                  <td className="whitespace-nowrap px-6 py-3 text-sm max-w-[200px] truncate">{c.subject}</td>
                  <td className="whitespace-nowrap px-6 py-3 text-sm">{c.agent}</td>
                  <td className="whitespace-nowrap px-6 py-3 text-sm">{channelLabels[c.channel] ?? c.channel}</td>
                  <td className="whitespace-nowrap px-6 py-3">
                    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', statusColors[c.status] ?? 'text-gray-600',
                      c.status === 'resolved' && 'bg-emerald-50', c.status === 'open' && 'bg-amber-50', c.status === 'escalated' && 'bg-red-50')}>
                      {c.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-sm">{fmtMin(c.durationMin)}</td>
                  <td className="whitespace-nowrap px-6 py-3 text-sm text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      </div>
    </div>
  );
}
