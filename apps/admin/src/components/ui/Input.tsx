'use client';

import { cn } from '@/lib/utils';

export const inputStyles =
  'flex h-10 w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50';

export const inputStylesSm =
  'flex h-9 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  sizing?: 'default' | 'sm';
}

export function Input({ className, sizing = 'default', ...props }: InputProps) {
  return (
    <input
      className={cn(sizing === 'sm' ? inputStylesSm : inputStyles, className)}
      {...props}
    />
  );
}
