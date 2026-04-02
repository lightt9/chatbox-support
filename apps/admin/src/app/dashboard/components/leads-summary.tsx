'use client';

import { Users, UserPlus, TrendingUp, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeadsSummaryData {
  totalLeads: number;
  newLeadsToday: number;
  conversionRate: number;
  leadsFromChat: number;
}

interface LeadsSummaryProps {
  data: LeadsSummaryData | null;
  loading?: boolean;
}

function SummarySkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-4 h-5 w-32 rounded bg-muted animate-pulse" />
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1">
            <div className="h-8 w-12 rounded bg-muted animate-pulse" />
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LeadsSummary({ data, loading = false }: LeadsSummaryProps) {
  if (loading || !data) return <SummarySkeleton />;

  const items = [
    {
      label: 'Total Leads',
      value: data.totalLeads.toString(),
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    },
    {
      label: 'New Today',
      value: data.newLeadsToday.toString(),
      icon: UserPlus,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/30',
    },
    {
      label: 'Conversion Rate',
      value: `${data.conversionRate}%`,
      icon: TrendingUp,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/30',
    },
    {
      label: 'From Chat',
      value: data.leadsFromChat.toString(),
      icon: MessageSquare,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-900/30',
    },
  ];

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Leads</h3>
        <a
          href="/dashboard/leads"
          className="text-sm font-medium text-primary hover:underline"
        >
          View all
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-lg bg-muted/40 p-3 transition-colors hover:bg-muted/60"
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-md',
                    item.bgColor,
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', item.color)} />
                </div>
                <span className="text-2xl font-bold">{item.value}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
