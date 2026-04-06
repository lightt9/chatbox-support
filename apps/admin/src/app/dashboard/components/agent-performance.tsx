'use client';

import { cn } from '@/lib/utils';
import { Star, MessageSquare, CheckCircle2, Clock, ArrowRight } from 'lucide-react';

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
  offline: 'bg-gray-400 dark:bg-gray-600',
};

function TableSkeleton() {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="mb-5 h-5 w-40 rounded-md bg-muted animate-pulse" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-28 rounded-md bg-muted animate-pulse" />
              <div className="h-3 w-20 rounded-md bg-muted animate-pulse" />
            </div>
            <div className="h-4 w-12 rounded-md bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AgentPerformance({ agents, loading = false }: AgentPerformanceProps) {
  if (loading) return <TableSkeleton />;

  return (
    <div className="rounded-xl border border-border/40 bg-card p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Agent Performance</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {agents.filter((a) => a.status === 'online').length} agents online
          </p>
        </div>
        <a
          href="/dashboard/operators"
          className="group flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>

      {agents.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60">
          <p className="text-sm text-muted-foreground">No agent data yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                style={{ borderBottom: '1px solid hsl(var(--border) / 0.4)' }}>
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
            <tbody>
              {agents.map((agent) => (
                <tr
                  key={agent.id}
                  className="group transition-colors hover:bg-muted/30"
                  style={{ borderBottom: '1px solid hsl(var(--border) / 0.25)' }}
                >
                  <td className="py-3 pr-4">
                    <a
                      href={`/dashboard/operators/${agent.id}`}
                      className="flex items-center gap-3"
                    >
                      <div className="relative">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 text-sm font-semibold text-primary">
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
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
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
                      <span className="text-xs text-muted-foreground">&mdash;</span>
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
