'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

/* ── Types ──────────────────────────────────────────────────────────────────── */

type ThemeName = 'light' | 'dark' | 'system';
type ColorName = 'indigo' | 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'pink';

interface ThemeContextType {
  theme: ThemeName;
  primaryColor: ColorName;
  /** Hex string like "#3b82f6" — use for SVG fills, box-shadows, etc. */
  primaryHex: string;
  setTheme: (theme: ThemeName) => void;
  setPrimaryColor: (color: ColorName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/* ── Color definitions ──────────────────────────────────────────────────────── */

interface ColorDef {
  h: string;
  s: string;
  l: string;
  hex: string;
}

const COLOR_MAP: Record<ColorName, ColorDef> = {
  indigo: { h: '239',   s: '84%',   l: '67%',   hex: '#6366f1' },
  blue:   { h: '221.2', s: '83.2%', l: '53.3%', hex: '#3b82f6' },
  purple: { h: '262.1', s: '83.3%', l: '57.8%', hex: '#8b5cf6' },
  green:  { h: '142.1', s: '76.2%', l: '36.3%', hex: '#16a34a' },
  orange: { h: '24.6',  s: '95%',   l: '53.1%', hex: '#f97316' },
  red:    { h: '0',     s: '84.2%', l: '60.2%', hex: '#ef4444' },
  pink:   { h: '330.4', s: '81.2%', l: '60.4%', hex: '#ec4899' },
};

const VALID_COLORS = new Set<string>(Object.keys(COLOR_MAP));
const VALID_THEMES = new Set<string>(['light', 'dark', 'system']);

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function applyThemeClass(theme: ThemeName) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  }
}

function applyPrimaryColor(color: ColorName) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.indigo;
  const root = document.documentElement;
  root.style.setProperty('--primary', `${c.h} ${c.s} ${c.l}`);
  root.style.setProperty('--ring', `${c.h} ${c.s} ${c.l}`);
  root.style.setProperty('--primary-hex', c.hex);
}

/* ── Provider ───────────────────────────────────────────────────────────────── */

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('light');
  const [primaryColor, setPrimaryColorState] = useState<ColorName>('indigo');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') ?? 'light';
    const savedColor = localStorage.getItem('app-primary-color') ?? 'indigo';
    const t = (VALID_THEMES.has(savedTheme) ? savedTheme : 'light') as ThemeName;
    const c = (VALID_COLORS.has(savedColor) ? savedColor : 'indigo') as ColorName;
    setThemeState(t);
    setPrimaryColorState(c);
    applyThemeClass(t);
    applyPrimaryColor(c);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyThemeClass('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    localStorage.setItem('app-theme', t);
    applyThemeClass(t);
  }, []);

  const setPrimaryColor = useCallback((c: ColorName) => {
    setPrimaryColorState(c);
    localStorage.setItem('app-primary-color', c);
    applyPrimaryColor(c);
  }, []);

  if (!mounted) return null;

  const primaryHex = (COLOR_MAP[primaryColor] ?? COLOR_MAP.indigo).hex;

  return (
    <ThemeContext.Provider value={{ theme, primaryColor, primaryHex, setTheme, setPrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

/* ── Hook ───────────────────────────────────────────────────────────────────── */

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { COLOR_MAP, type ColorName, type ThemeName };
