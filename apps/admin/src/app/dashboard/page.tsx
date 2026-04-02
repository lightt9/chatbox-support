'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Bot,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { ActivityFeed } from './components/activity-feed';
import { AgentPerformance } from './components/agent-performance';
import { LiveStats } from './components/live-stats';
import { LeadsSummary } from './components/leads-summary';

// ── Types ───────────────────────────────────────────────────────────────────

type Period = '24h' | '7d' | '30d';

interface Metrics {
  activeConversations: number;
  resolutionRate: number;
  avgResponseTime: number;
  aiResolutionRate: number;
  escalationRate: number;
  previousPeriod: {
    activeConversations: number;
    resolutionRate: number;
    avgResponseTime: number;
    aiResolutionRate: number;
    escalationRate: number;
  };
}

interface ChartPoint {
  date: string;
  total: number;
  resolved: number;
  escalated: number;
}

interface Agent {
  id: string;
  name: string;
  avatarUrl: string | null;
  status: string;
  activeChats: number;
  resolvedChats: number;
  avgResponseTime: number;
  rating: number;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  metadata: Record<string, string>;
}

interface LiveData {
  activeChats: number;
  pendingChats: number;
  currentlyTyping: number;
  onlineOperators: number;
}

interface LeadsData {
  totalLeads: number;
  newLeadsToday: number;
  conversionRate: number;
  leadsFromChat: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatResponseTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Skeleton components ─────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 rounded bg-muted" />
        <div className="h-10 w-10 rounded-lg bg-muted" />
      </div>
      <div className="mt-3">
        <div className="h-8 w-20 rounded bg-muted" />
        <div className="mt-2 h-4 w-32 rounded bg-muted" />
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-4">
        <div className="h-5 w-44 rounded bg-muted animate-pulse" />
        <div className="mt-1 h-4 w-64 rounded bg-muted animate-pulse" />
      </div>
      <div className="h-64 rounded bg-muted/50 animate-pulse" />
    </div>
  );
}

// ── Pie chart colors ────────────────────────────────────────────────────────

const PIE_COLORS = ['hsl(221, 83%, 53%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)'];

// ── Main dashboard ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('7d');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [leadsData, setLeadsData] = useState<LeadsData | null>(null);
  const [loading, setLoading] = useState(true);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch all dashboard data
  const fetchData = useCallback(async (p: Period, isInitial = false) => {
    if (isInitial) setLoading(true);

    try {
      const [m, c, a, act, live, leads] = await Promise.all([
        api.get<Metrics>(`/dashboard/metrics?period=${p}`),
        api.get<{ data: ChartPoint[] }>(`/dashboard/conversations?period=${p}`),
        api.get<{ data: Agent[] }>(`/dashboard/agents?period=${p}`),
        api.get<{ data: ActivityItem[] }>('/dashboard/activity?limit=15'),
        api.get<LiveData>('/dashboard/live'),
        api.get<LeadsData>(`/dashboard/leads?period=${p}`),
      ]);

      setMetrics(m);
      setChartData(c.data);
      setAgents(a.data);
      setActivity(act.data);
      setLiveData(live);
      setLeadsData(leads);
    } catch {
      // Silently handle — stale data stays on screen
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchData(period, true);

    pollRef.current = setInterval(() => fetchData(period), 10_000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [period, fetchData]);

  // Period change handler
  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
  };

  // Build KPI card data from metrics
  const kpiCards = metrics
    ? [
        {
          title: 'Active Conversations',
          value: metrics.activeConversations.toString(),
          change: pctChange(
            metrics.activeConversations,
            metrics.previousPeriod.activeConversations,
          ),
          icon: MessageSquare,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 dark:bg-blue-900/30',
          href: '/dashboard/conversations',
        },
        {
          title: 'Resolution Rate',
          value: `${metrics.resolutionRate}%`,
          change: metrics.resolutionRate - metrics.previousPeriod.resolutionRate,
          icon: CheckCircle2,
          color: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-900/30',
        },
        {
          title: 'Escalation Rate',
          value: `${metrics.escalationRate}%`,
          change: metrics.escalationRate - metrics.previousPeriod.escalationRate,
          invertTrend: true,
          icon: AlertTriangle,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50 dark:bg-amber-900/30',
        },
        {
          title: 'Avg Response Time',
          value: formatResponseTime(metrics.avgResponseTime),
          change: pctChange(
            metrics.previousPeriod.avgResponseTime,
            metrics.avgResponseTime,
          ),
          icon: Clock,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50 dark:bg-purple-900/30',
        },
        {
          title: 'AI Resolution Rate',
          value: `${metrics.aiResolutionRate}%`,
          change:
            metrics.aiResolutionRate - metrics.previousPeriod.aiResolutionRate,
          icon: Bot,
          color: 'text-cyan-600',
          bgColor: 'bg-cyan-50 dark:bg-cyan-900/30',
        },
      ]
    : [];

  // Build pie chart data from metrics
  const pieData = metrics
    ? [
        {
          name: 'AI Resolved',
          value: Math.round(
            (metrics.aiResolutionRate / 100) * metrics.resolutionRate,
          ),
        },
        {
          name: 'Human Resolved',
          value: Math.round(
            metrics.resolutionRate -
              (metrics.aiResolutionRate / 100) * metrics.resolutionRate,
          ),
        },
        {
          name: 'Pending',
          value: Math.round(100 - metrics.resolutionRate),
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Page header + filter */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your support operations
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          {(['24h', '7d', '30d'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                period === p
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              {p === '24h' ? '24h' : p === '7d' ? '7 days' : '30 days'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {loading
          ? [1, 2, 3, 4, 5].map((i) => <CardSkeleton key={i} />)
          : kpiCards.map((card) => {
              const isPositive = card.invertTrend
                ? card.change <= 0
                : card.change >= 0;
              const changeStr =
                card.change >= 0
                  ? `+${card.change.toFixed(1)}%`
                  : `${card.change.toFixed(1)}%`;

              const inner = (
                <div
                  className={cn(
                    'rounded-lg border bg-card p-6 shadow-sm transition-all duration-200',
                    card.href &&
                      'cursor-pointer hover:-translate-y-0.5 hover:shadow-md',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">
                      {card.title}
                    </p>
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        card.bgColor,
                      )}
                    >
                      <card.icon className={cn('h-5 w-5', card.color)} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-3xl font-bold">{card.value}</p>
                    <div className="mt-1 flex items-center gap-1">
                      {isPositive ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span
                        className={cn(
                          'text-sm font-medium',
                          isPositive ? 'text-green-600' : 'text-red-600',
                        )}
                      >
                        {changeStr}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        vs prev
                      </span>
                    </div>
                  </div>
                </div>
              );

              return card.href ? (
                <a key={card.title} href={card.href}>
                  {inner}
                </a>
              ) : (
                <div key={card.title}>{inner}</div>
              );
            })}
      </div>

      {/* Charts area */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Conversations Over Time — spans 2 cols */}
        {loading ? (
          <div className="lg:col-span-2">
            <ChartSkeleton />
          </div>
        ) : (
          <div className="lg:col-span-2 rounded-lg border bg-card p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Conversations Over Time</h3>
              <p className="text-sm text-muted-foreground">
                Daily conversation volume
              </p>
            </div>
            {chartData.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-md border-2 border-dashed border-muted">
                <p className="text-sm text-muted-foreground">
                  No conversation data yet
                </p>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData.map((d) => ({
                      ...d,
                      name: formatDate(d.date),
                    }))}
                    margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="totalGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="hsl(221,83%,53%)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(221,83%,53%)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="resolvedGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="hsl(142,71%,45%)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(142,71%,45%)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                        color: 'hsl(var(--foreground))',
                        fontSize: '0.875rem',
                      }}
                    />
                    <Legend iconType="circle" iconSize={8} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Total"
                      stroke="hsl(221,83%,53%)"
                      strokeWidth={2}
                      fill="url(#totalGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="resolved"
                      name="Resolved"
                      stroke="hsl(142,71%,45%)"
                      strokeWidth={2}
                      fill="url(#resolvedGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="escalated"
                      name="Escalated"
                      stroke="hsl(25,95%,53%)"
                      strokeWidth={2}
                      fill="transparent"
                      strokeDasharray="5 5"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Resolution Breakdown — 1 col */}
        {loading ? (
          <ChartSkeleton />
        ) : (
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Resolution Breakdown</h3>
            <p className="text-sm text-muted-foreground">
              How conversations are resolved
            </p>
            {pieData.every((d) => d.value === 0) ? (
              <div className="mt-4 flex h-52 items-center justify-center rounded-md border-2 border-dashed border-muted">
                <p className="text-sm text-muted-foreground">No data yet</p>
              </div>
            ) : (
              <div className="mt-2 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                        color: 'hsl(var(--foreground))',
                        fontSize: '0.875rem',
                      }}
                      formatter={(value: number) => `${value}%`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-2 flex justify-center gap-4">
              {pieData.map((d, idx) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[idx] }}
                  />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-medium">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Live stats + Leads + Agent Performance row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <LiveStats data={liveData} loading={loading} />
        <LeadsSummary data={leadsData} loading={loading} />
        <div className="lg:col-span-1">
          <AgentPerformance agents={agents} loading={loading} />
        </div>
      </div>

      {/* Activity feed */}
      <ActivityFeed items={activity} loading={loading} />
    </div>
  );
}
