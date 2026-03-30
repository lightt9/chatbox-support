'use client';

import {
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const kpiCards = [
  {
    title: 'Active Conversations',
    value: '142',
    change: '+12.5%',
    trend: 'up' as const,
    icon: MessageSquare,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    title: 'Resolution Rate',
    value: '87.3%',
    change: '+3.2%',
    trend: 'up' as const,
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    title: 'Escalation Rate',
    value: '8.7%',
    change: '-1.4%',
    trend: 'down' as const,
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  {
    title: 'Avg Response Time',
    value: '1.2m',
    change: '-0.3m',
    trend: 'down' as const,
    icon: Clock,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your support operations
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <div
            key={card.title}
            className="rounded-lg border bg-card p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {card.title}
              </p>
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  card.bgColor
                )}
              >
                <card.icon className={cn('h-5 w-5', card.color)} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-bold">{card.value}</p>
              <div className="mt-1 flex items-center gap-1">
                {card.title === 'Escalation Rate' ||
                card.title === 'Avg Response Time' ? (
                  <TrendingDown className="h-4 w-4 text-green-600" />
                ) : card.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span
                  className={cn(
                    'text-sm font-medium',
                    card.title === 'Escalation Rate' ||
                      card.title === 'Avg Response Time'
                      ? 'text-green-600'
                      : card.trend === 'up'
                        ? 'text-green-600'
                        : 'text-red-600'
                  )}
                >
                  {card.change}
                </span>
                <span className="text-sm text-muted-foreground">
                  vs last week
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts area */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Conversations chart placeholder */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Conversations Over Time</h3>
          <p className="text-sm text-muted-foreground">
            Daily conversation volume for the past 30 days
          </p>
          <div className="mt-4 flex h-64 items-center justify-center rounded-md border-2 border-dashed border-muted">
            <p className="text-sm text-muted-foreground">
              Chart placeholder - Recharts integration
            </p>
          </div>
        </div>

        {/* Resolution breakdown placeholder */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Resolution Breakdown</h3>
          <p className="text-sm text-muted-foreground">
            How conversations are being resolved
          </p>
          <div className="mt-4 flex h-64 items-center justify-center rounded-md border-2 border-dashed border-muted">
            <p className="text-sm text-muted-foreground">
              Chart placeholder - Pie/Donut chart
            </p>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Recent Activity</h3>
        <p className="text-sm text-muted-foreground">
          Latest events across all companies
        </p>
        <div className="mt-4 flex h-48 items-center justify-center rounded-md border-2 border-dashed border-muted">
          <p className="text-sm text-muted-foreground">
            Activity feed placeholder
          </p>
        </div>
      </div>
    </div>
  );
}
