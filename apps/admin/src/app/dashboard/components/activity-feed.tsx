'use client';

import {
  MessageSquarePlus,
  CheckCircle2,
  Reply,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  metadata: Record<string, string>;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  loading?: boolean;
}

function timeAgo(timestamp: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(timestamp).getTime()) / 1000,
  );
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const typeConfig: Record<
  string,
  { icon: typeof MessageSquarePlus; color: string; bgColor: string }
> = {
  conversation_started: {
    icon: MessageSquarePlus,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-500/10',
  },
  conversation_resolved: {
    icon: CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-500/10',
  },
  operator_replied: {
    icon: Reply,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-500/10',
  },
  lead_created: {
    icon: UserPlus,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-500/10',
  },
};

function FeedSkeleton() {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="mb-5 h-5 w-32 rounded-md bg-muted animate-pulse" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-3/4 rounded-md bg-muted animate-pulse" />
              <div className="h-3 w-16 rounded-md bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActivityFeed({ items, loading = false }: ActivityFeedProps) {
  if (loading) return <FeedSkeleton />;

  return (
    <div className="rounded-xl border border-border/40 bg-card p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Live Activity</h3>

      {items.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60">
          <MessageSquarePlus className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-0.5 max-h-[400px] overflow-y-auto pr-1">
          {items.map((item, idx) => {
            const config = typeConfig[item.type] ?? typeConfig.conversation_started;
            const Icon = config.icon;

            return (
              <div
                key={`${item.id}-${idx}`}
                className={cn(
                  'flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/40',
                  idx === 0 && 'animate-fade-in',
                )}
              >
                <div
                  className={cn(
                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    config.bgColor,
                  )}
                >
                  <Icon className={cn('h-4 w-4', config.color)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">{item.description}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {timeAgo(item.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
