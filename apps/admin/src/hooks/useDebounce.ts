'use client';

import { useRef, useCallback } from 'react';

export function useDebounce<T extends (...args: any[]) => void>(fn: T, delay = 300) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay],
  ) as T;
}
