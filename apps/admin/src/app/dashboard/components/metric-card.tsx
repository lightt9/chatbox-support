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
    <div className="rounded-lg border bg-card p-6 shadow-sm animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 rounded bg-muted" />
        <div className="h-10 w-10 rounded-lg bg-muted" />
      </div>
      <div className="mt-3">
        <div className="h-8 w-20 rounded bg-muted" />
        <div className="mt-2 h-4 w-32 rounded bg-muted" />
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
        'rounded-lg border bg-card p-6 shadow-sm transition-all duration-200',
        href && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md',
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            bgColor,
          )}
        >
          <Icon className={cn('h-5 w-5', color)} />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <div className="mt-1 flex items-center gap-1">
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
          )}
          <span
            className={cn(
              'text-sm font-medium',
              isPositive
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400',
            )}
          >
            {changeStr}
          </span>
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
