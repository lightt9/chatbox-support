'use client';

import { cn } from '@/lib/utils';
import { Star, MessageSquare, CheckCircle2, Clock } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  avatarUrl: string | null;
  status: string;
  activeChats: number;
  resolvedChats: number;
  avgResponseTime: number;
  rating: number;
}

interface AgentPerformanceProps {
  agents: Agent[];
  loading?: boolean;
}

function formatResponseTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  offline: 'bg-gray-400',
};

function TableSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-4 h-5 w-40 rounded bg-muted animate-pulse" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-28 rounded bg-muted animate-pulse" />
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-4 w-12 rounded bg-muted animate-pulse" />
            <div className="h-4 w-12 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AgentPerformance({ agents, loading = false }: AgentPerformanceProps) {
  if (loading) return <TableSkeleton />;

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Agent Performance</h3>
          <p className="text-sm text-muted-foreground">
            {agents.filter((a) => a.status === 'online').length} agents online
          </p>
        </div>
        <a
          href="/dashboard/operators"
          className="text-sm font-medium text-primary hover:underline"
        >
          View all
        </a>
      </div>

      {agents.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-md border-2 border-dashed border-muted">
          <p className="text-sm text-muted-foreground">No agent data yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">Agent</th>
                <th className="pb-3 px-3 text-center">
                  <MessageSquare className="mx-auto h-3.5 w-3.5" />
                </th>
                <th className="pb-3 px-3 text-center">
                  <CheckCircle2 className="mx-auto h-3.5 w-3.5" />
                </th>
                <th className="pb-3 px-3 text-center">
                  <Clock className="mx-auto h-3.5 w-3.5" />
                </th>
                <th className="pb-3 pl-3 text-center">
                  <Star className="mx-auto h-3.5 w-3.5" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {agents.map((agent) => (
                <tr
                  key={agent.id}
                  className="group transition-colors hover:bg-muted/50"
                >
                  <td className="py-3 pr-4">
                    <a
                      href={`/dashboard/operators/${agent.id}`}
                      className="flex items-center gap-3"
                    >
                      <div className="relative">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {agent.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                        <span
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card',
                            statusColors[agent.status] ?? 'bg-gray-400',
                          )}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium group-hover:text-primary transition-colors">
                          {agent.name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {agent.status}
                        </p>
                      </div>
                    </a>
                  </td>
                  <td className="px-3 text-center">
                    <span className={cn(
                      'inline-flex min-w-[2rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium',
                      agent.activeChats > 0
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'text-muted-foreground',
                    )}>
                      {agent.activeChats}
                    </span>
                  </td>
                  <td className="px-3 text-center text-sm text-muted-foreground">
                    {agent.resolvedChats}
                  </td>
                  <td className="px-3 text-center text-sm text-muted-foreground">
                    {formatResponseTime(agent.avgResponseTime)}
                  </td>
                  <td className="pl-3 text-center">
                    {agent.rating > 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-sm">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {agent.rating.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
