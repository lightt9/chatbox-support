'use client';

import { useEffect } from 'react';
import { Check, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  return (
    <div
      className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3 text-sm font-medium animate-slide-up"
      style={{ boxShadow: 'var(--shadow-xl)' }}
    >
      <div className={`flex h-7 w-7 items-center justify-center rounded-full ${
        type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
      }`}>
        {type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      </div>
      <span className="text-foreground">{message}</span>
      <button onClick={onClose} className="ml-2 cursor-pointer rounded-md p-0.5 text-muted-foreground hover:text-foreground transition-colors">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
