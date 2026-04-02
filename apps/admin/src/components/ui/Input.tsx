'use client';

import { cn } from '@/lib/utils';

export const inputStyles =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export const inputStylesSm =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

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
