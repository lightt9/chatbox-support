'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId: string;
  avatarUrl: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

const AUTH_KEYS = ['accessToken', 'refreshToken', 'user', 'rememberMe'] as const;

function getStorage(): Storage {
  return localStorage.getItem('rememberMe') === 'true' ||
    sessionStorage.getItem('rememberMe') === 'true'
    ? localStorage
    : sessionStorage;
}

function readAuthState(): { token: string | null; user: User | null } {
  try {
    // Check localStorage first (remember me), then sessionStorage
    const storage =
      localStorage.getItem('accessToken') ? localStorage : sessionStorage;
    const storedToken = storage.getItem('accessToken');
    const storedUser = storage.getItem('user');
    if (storedToken && storedUser) {
      return { token: storedToken, user: JSON.parse(storedUser) };
    }
  } catch {
    // Clear corrupted data from both storages
    for (const key of AUTH_KEYS) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  }
  return { token: null, user: null };
}

function clearAuthState(): void {
  for (const key of AUTH_KEYS) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const { token: t, user: u } = readAuthState();
    setToken(t);
    setUser(u);
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string, rememberMe: boolean) => {
      const response = await api.post<LoginResponse>('/auth/login', {
        email,
        password,
      });

      const { accessToken, refreshToken, user: userData } = response;
      const storage = rememberMe ? localStorage : sessionStorage;

      // Clear both storages first
      clearAuthState();

      // Persist to chosen storage
      storage.setItem('accessToken', accessToken);
      storage.setItem('refreshToken', refreshToken);
      storage.setItem('user', JSON.stringify(userData));
      storage.setItem('rememberMe', String(rememberMe));

      setToken(accessToken);
      setUser(userData);

      router.push('/dashboard');
    },
    [router]
  );

  const logout = useCallback(() => {
    clearAuthState();
    setToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
