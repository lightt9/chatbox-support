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
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
  },
  conversation_resolved: {
    icon: CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/30',
  },
  operator_replied: {
    icon: Reply,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/30',
  },
  lead_created: {
    icon: UserPlus,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30',
  },
};

function FeedSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-4 h-5 w-32 rounded bg-muted animate-pulse" />
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
              <div className="h-3 w-16 rounded bg-muted animate-pulse" />
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
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">Live Activity</h3>

      {items.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-md border-2 border-dashed border-muted">
          <p className="text-sm text-muted-foreground">
            No recent activity
          </p>
        </div>
      ) : (
        <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
          {items.map((item, idx) => {
            const config = typeConfig[item.type] ?? typeConfig.conversation_started;
            const Icon = config.icon;

            return (
              <div
                key={`${item.id}-${idx}`}
                className={cn(
                  'flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50',
                  idx === 0 && 'animate-[fadeIn_0.3s_ease-out]',
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
