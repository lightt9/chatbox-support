'use client';

import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  Users,
  MessageSquare,
  Clock,
} from 'lucide-react';

const reportCards = [
  {
    title: 'Conversation Volume',
    description: 'Total conversations over time with trend analysis',
    icon: MessageSquare,
  },
  {
    title: 'Agent Performance',
    description: 'Individual and team performance metrics',
    icon: Users,
  },
  {
    title: 'Response Times',
    description: 'Average first response and resolution times',
    icon: Clock,
  },
  {
    title: 'Customer Satisfaction',
    description: 'CSAT scores and feedback analysis',
    icon: TrendingUp,
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Analytics and reporting for your support operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted">
            <Calendar className="h-4 w-4" />
            Last 30 days
          </button>
          <button className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Conversations</p>
          <p className="mt-2 text-3xl font-bold">4,328</p>
          <p className="mt-1 text-sm text-green-600">+12% vs previous period</p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Avg Resolution Time</p>
          <p className="mt-2 text-3xl font-bold">4.2h</p>
          <p className="mt-1 text-sm text-green-600">-18% vs previous period</p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">CSAT Score</p>
          <p className="mt-2 text-3xl font-bold">4.6/5</p>
          <p className="mt-1 text-sm text-green-600">+0.3 vs previous period</p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">AI Resolution Rate</p>
          <p className="mt-2 text-3xl font-bold">73%</p>
          <p className="mt-1 text-sm text-green-600">+5% vs previous period</p>
        </div>
      </div>

      {/* Report sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {reportCards.map((report) => (
          <div
            key={report.title}
            className="rounded-lg border bg-card p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <report.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">{report.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {report.description}
                </p>
              </div>
            </div>
            <div className="mt-4 flex h-48 items-center justify-center rounded-md border-2 border-dashed border-muted">
              <p className="text-sm text-muted-foreground">
                Chart placeholder - Recharts integration
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
