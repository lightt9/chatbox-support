'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { MessageSquare } from 'lucide-react';

interface ChartDataPoint {
  date: string;
  total: number;
  resolved: number;
  escalated: number;
}

interface ConversationsChartProps {
  data: ChartDataPoint[];
  loading?: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border) / 0.5)',
  borderRadius: '0.75rem',
  color: 'hsl(var(--foreground))',
  fontSize: '0.8125rem',
  padding: '8px 12px',
  boxShadow: 'var(--shadow-lg)',
};

function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="mb-5">
        <div className="h-5 w-44 rounded-md bg-muted animate-pulse" />
        <div className="mt-1.5 h-4 w-64 rounded-md bg-muted animate-pulse" />
      </div>
      <div className="h-72 rounded-xl bg-muted/30 animate-pulse" />
    </div>
  );
}

export function ConversationsChart({ data, loading = false }: ConversationsChartProps) {
  if (loading) return <ChartSkeleton />;

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border/40 bg-card p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Conversations Over Time</h3>
        <div className="mt-4 flex h-72 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60">
          <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No conversation data yet</p>
        </div>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    name: formatDate(d.date),
  }));

  return (
    <div className="rounded-xl border border-border/40 bg-card p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="mb-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Conversations Over Time</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Daily conversation volume</p>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '12px' }} />
            <Area type="monotone" dataKey="total" name="Total" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#totalGrad)" />
            <Area type="monotone" dataKey="resolved" name="Resolved" stroke="hsl(142, 71%, 45%)" strokeWidth={2} fill="url(#resolvedGrad)" />
            <Area type="monotone" dataKey="escalated" name="Escalated" stroke="hsl(var(--destructive))" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
