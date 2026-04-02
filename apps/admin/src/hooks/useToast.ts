'use client';

import { useState, useCallback } from 'react';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showSuccess = useCallback((message: string) => {
    setToast({ message, type: 'success' });
  }, []);

  const showError = useCallback((message: string) => {
    setToast({ message, type: 'error' });
  }, []);

  const dismiss = useCallback(() => {
    setToast(null);
  }, []);

  return { toast, showSuccess, showError, dismiss };
}
