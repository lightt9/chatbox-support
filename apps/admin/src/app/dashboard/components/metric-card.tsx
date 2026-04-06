'use client';

import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  invertTrend?: boolean;
  href?: string;
  loading?: boolean;
}

function Skeleton() {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-6 animate-pulse"
      style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 rounded-md bg-muted" />
        <div className="h-10 w-10 rounded-xl bg-muted" />
      </div>
      <div className="mt-4">
        <div className="h-8 w-20 rounded-md bg-muted" />
        <div className="mt-2.5 h-4 w-32 rounded-md bg-muted" />
      </div>
    </div>
  );
}

export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  color,
  bgColor,
  invertTrend = false,
  href,
  loading = false,
}: MetricCardProps) {
  if (loading) return <Skeleton />;

  const isPositive = invertTrend ? change <= 0 : change >= 0;
  const changeStr = change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;

  const card = (
    <div
      className={cn(
        'rounded-xl border border-border/40 bg-card p-6 transition-all duration-200',
        href && 'cursor-pointer hover:-translate-y-0.5',
      )}
      style={{ boxShadow: 'var(--shadow-sm)' }}
      onMouseEnter={(e) => { if (href) e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
      onMouseLeave={(e) => { if (href) e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', bgColor)}>
          <Icon className={cn('h-5 w-5', color)} />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <div className={cn(
            'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            isPositive
              ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400'
              : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
          )}>
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {changeStr}
          </div>
          <span className="text-xs text-muted-foreground">vs prev</span>
        </div>
      </div>
    </div>
  );

  if (href) {
    return <a href={href}>{card}</a>;
  }

  return card;
}
