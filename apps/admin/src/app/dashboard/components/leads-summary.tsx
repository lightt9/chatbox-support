'use client';

import { Users, UserPlus, TrendingUp, MessageSquare, ArrowRight } from 'lucide-react';
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
    <div className="rounded-xl border border-border/40 bg-card p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="mb-5 h-5 w-32 rounded-md bg-muted animate-pulse" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl bg-muted/40 p-3.5 space-y-2">
            <div className="h-8 w-12 rounded-md bg-muted animate-pulse" />
            <div className="h-3 w-20 rounded-md bg-muted animate-pulse" />
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
      bgColor: 'bg-blue-50 dark:bg-blue-500/10',
    },
    {
      label: 'New Today',
      value: data.newLeadsToday.toString(),
      icon: UserPlus,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-500/10',
    },
    {
      label: 'Conversion Rate',
      value: `${data.conversionRate}%`,
      icon: TrendingUp,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-500/10',
    },
    {
      label: 'From Chat',
      value: data.leadsFromChat.toString(),
      icon: MessageSquare,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-500/10',
    },
  ];

  return (
    <div className="rounded-xl border border-border/40 bg-card p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Leads</h3>
        <a
          href="/dashboard/leads"
          className="group flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-xl bg-muted/30 p-3.5 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-2.5">
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', item.bgColor)}>
                  <Icon className={cn('h-4 w-4', item.color)} />
                </div>
                <span className="text-2xl font-bold tracking-tight">{item.value}</span>
              </div>
              <p className="mt-1.5 text-xs font-medium text-muted-foreground">{item.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
