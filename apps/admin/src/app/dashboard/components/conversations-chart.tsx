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

function ChartSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-4">
        <div className="h-5 w-44 rounded bg-muted animate-pulse" />
        <div className="mt-1 h-4 w-64 rounded bg-muted animate-pulse" />
      </div>
      <div className="h-72 rounded bg-muted/50 animate-pulse" />
    </div>
  );
}

export function ConversationsChart({ data, loading = false }: ConversationsChartProps) {
  if (loading) return <ChartSkeleton />;

  if (data.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Conversations Over Time</h3>
        <div className="mt-4 flex h-72 items-center justify-center rounded-md border-2 border-dashed border-muted">
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
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Conversations Over Time</h3>
        <p className="text-sm text-muted-foreground">
          Daily conversation volume
        </p>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
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
              stroke="hsl(221, 83%, 53%)"
              strokeWidth={2}
              fill="url(#totalGrad)"
            />
            <Area
              type="monotone"
              dataKey="resolved"
              name="Resolved"
              stroke="hsl(142, 71%, 45%)"
              strokeWidth={2}
              fill="url(#resolvedGrad)"
            />
            <Area
              type="monotone"
              dataKey="escalated"
              name="Escalated"
              stroke="hsl(25, 95%, 53%)"
              strokeWidth={2}
              fill="transparent"
              strokeDasharray="5 5"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
