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
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-500/10',
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
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-500/10',
    },
    {
      label: 'Agents Online',
      value: data.onlineOperators,
      icon: Headphones,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-500/10',
    },
  ];

  return (
    <div className="rounded-xl border border-border/40 bg-card p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="mb-5 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Live Now</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl bg-muted/30 p-3.5 transition-colors hover:bg-muted/50"
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
