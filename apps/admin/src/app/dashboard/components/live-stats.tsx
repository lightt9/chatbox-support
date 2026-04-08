'use client';

import { Radio, Users, MessageCircle, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveStatsData {
  activeChats: number;
  pendingChats: number;
  currentlyTyping: number;
  onlineOperators: number;
}

interface LiveStatsProps {
  data: LiveStatsData | null;
  loading?: boolean;
}

function StatsSkeleton() {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="mb-5 h-5 w-24 rounded-md bg-muted animate-pulse" />
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

export function LiveStats({ data, loading = false }: LiveStatsProps) {
  if (loading || !data) return <StatsSkeleton />;

  const stats = [
    {
      label: 'Active Chats',
      value: data.activeChats,
      icon: MessageCircle,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-500/10',
    },
    {
      label: 'Pending',
      value: data.pendingChats,
      icon: Radio,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-500/10',
    },
    {
      label: 'Currently Active',
      value: data.currentlyTyping,
      icon: Users,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      label: 'Agents Online',
      value: data.onlineOperators,
      icon: Headphones,
      color: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-violet-50 dark:bg-violet-500/10',
    },
  ];

  return (
    <div className="card-gradient p-6">
      <div className="mb-5 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <h3 className="section-header">Live Now</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl bg-muted/25 p-3.5 transition-all duration-200 hover:bg-muted/45 hover:shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', stat.bgColor)}>
                  <Icon className={cn('h-4 w-4', stat.color)} />
                </div>
                <span className="text-2xl font-bold tracking-tight">{stat.value}</span>
              </div>
              <p className="mt-1.5 text-xs font-medium text-muted-foreground">{stat.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
