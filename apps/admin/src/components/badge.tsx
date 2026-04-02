'use client';

import {
  AlertCircle,
  Eye,
  CheckCircle2,
  Flame,
  Flag,
  AlertTriangle,
  TrendingUp,
  Clock,
  XCircle,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Badge config registry ──────────────────────────────────────────────────── */

export interface BadgeConfig {
  label: string;
  icon: LucideIcon;
  soft: string;   // bg + text
  solid: string;  // bg + text
  outline: string; // border + text
}

const BADGE_REGISTRY: Record<string, BadgeConfig> = {
  // Status badges
  open: {
    label: 'Open',
    icon: AlertCircle,
    soft: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
    solid: 'bg-red-600 text-white',
    outline: 'border-red-300 text-red-700 dark:border-red-700 dark:text-red-400',
  },
  investigating: {
    label: 'Investigating',
    icon: Eye,
    soft: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
    solid: 'bg-amber-500 text-white',
    outline: 'border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400',
  },
  resolved: {
    label: 'Resolved',
    icon: CheckCircle2,
    soft: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
    solid: 'bg-emerald-600 text-white',
    outline: 'border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400',
  },

  // Severity badges
  low: {
    label: 'Low',
    icon: Zap,
    soft: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400',
    solid: 'bg-sky-500 text-white',
    outline: 'border-sky-300 text-sky-700 dark:border-sky-700 dark:text-sky-400',
  },
  medium: {
    label: 'Medium',
    icon: AlertTriangle,
    soft: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
    solid: 'bg-orange-500 text-white',
    outline: 'border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-400',
  },
  high: {
    label: 'High',
    icon: AlertCircle,
    soft: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400',
    solid: 'bg-rose-600 text-white',
    outline: 'border-rose-300 text-rose-700 dark:border-rose-700 dark:text-rose-400',
  },
  critical: {
    label: 'Critical',
    icon: XCircle,
    soft: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400',
    solid: 'bg-purple-600 text-white',
    outline: 'border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-400',
  },

  // Custom badges
  Hot: {
    label: 'Hot',
    icon: Flame,
    soft: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400',
    solid: 'bg-yellow-500 text-white',
    outline: 'border-yellow-400 text-yellow-700 dark:border-yellow-600 dark:text-yellow-400',
  },
  Flagged: {
    label: 'Flagged',
    icon: Flag,
    soft: 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-400',
    solid: 'bg-red-800 text-white',
    outline: 'border-red-400 text-red-800 dark:border-red-700 dark:text-red-400',
  },
  Failed: {
    label: 'Failed',
    icon: XCircle,
    soft: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
    solid: 'bg-red-700 text-white',
    outline: 'border-red-300 text-red-700 dark:border-red-700 dark:text-red-400',
  },
  Successful: {
    label: 'Successful',
    icon: CheckCircle2,
    soft: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
    solid: 'bg-green-700 text-white',
    outline: 'border-green-300 text-green-700 dark:border-green-700 dark:text-green-400',
  },
  Pending: {
    label: 'Pending',
    icon: Clock,
    soft: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400',
    solid: 'bg-indigo-600 text-white',
    outline: 'border-indigo-300 text-indigo-700 dark:border-indigo-700 dark:text-indigo-400',
  },
  Warning: {
    label: 'Warning',
    icon: AlertTriangle,
    soft: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300',
    solid: 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900',
    outline: 'border-neutral-400 text-neutral-700 dark:border-neutral-600 dark:text-neutral-300',
  },
  Trending: {
    label: 'Trending',
    icon: TrendingUp,
    soft: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400',
    solid: 'bg-indigo-700 text-white',
    outline: 'border-indigo-300 text-indigo-700 dark:border-indigo-700 dark:text-indigo-400',
  },
};

/* ── All available badge values for the picker ──────────────────────────────── */

export const BADGE_OPTIONS = {
  status: ['open', 'investigating', 'resolved'],
  severity: ['low', 'medium', 'high', 'critical'],
  custom: ['Hot', 'Flagged', 'Failed', 'Successful', 'Pending', 'Warning', 'Trending'],
};

export function getBadgeConfig(value: string): BadgeConfig {
  return (
    BADGE_REGISTRY[value] ?? {
      label: value,
      icon: Zap,
      soft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      solid: 'bg-gray-600 text-white',
      outline: 'border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300',
    }
  );
}

/* ── Badge component ────────────────────────────────────────────────────────── */

export type BadgeVariant = 'soft' | 'solid' | 'outline';

interface BadgeProps {
  value: string;
  variant?: BadgeVariant;
  showIcon?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

export function Badge({
  value,
  variant = 'soft',
  showIcon = true,
  removable = false,
  onRemove,
  onClick,
  className,
}: BadgeProps) {
  const config = getBadgeConfig(value);
  const Icon = config.icon;

  const variantClass =
    variant === 'outline'
      ? `border ${config.outline} bg-transparent`
      : config[variant];

  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all',
        variantClass,
        onClick && 'cursor-pointer hover:opacity-80 active:scale-95',
        className,
      )}
    >
      {showIcon && <Icon className="h-3 w-3 flex-shrink-0" />}
      {config.label}
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 -mr-1 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          <XCircle className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
