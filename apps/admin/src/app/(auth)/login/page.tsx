'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth';
import { api, ApiError } from '../../../lib/api';
import { Logo } from '../../../components/Logo';
import {
  initGoogleOneTap,
  isGoogleConfigured,
  renderGoogleButton,
} from '../../../lib/social-auth';

/* ── Social profile shape from our helper ──────────────────────────────────── */
interface SocialProfile {
  provider: 'google' | 'facebook' | 'apple';
  providerId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

/* ── Login response shape ──────────────────────────────────────────────────── */
interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    companyId: string;
    avatarUrl: string | null;
  };
}

/* ── SVG icons for social buttons ──────────────────────────────────────────── */
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */

const socialBtnClass =
  'flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  /* redirect if already logged in */
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [authLoading, isAuthenticated, router]);

  /* ── Social login handler ────────────────────────────────────────────────── */
  const handleSocialLogin = useCallback(
    async (profile: SocialProfile) => {
      setSocialLoading(profile.provider);
      setError('');
      try {
        const response = await api.post<LoginResponse>('/auth/social', profile);
        const { accessToken, refreshToken, user } = response;
        const storage = rememberMe ? localStorage : sessionStorage;
        ['accessToken', 'refreshToken', 'user', 'rememberMe'].forEach((k) => {
          localStorage.removeItem(k);
          sessionStorage.removeItem(k);
        });
        storage.setItem('accessToken', accessToken);
        storage.setItem('refreshToken', refreshToken);
        storage.setItem('user', JSON.stringify(user));
        storage.setItem('rememberMe', String(rememberMe));
        window.location.href = '/dashboard';
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Social sign-in failed. Please try again.',
        );
      } finally {
        setSocialLoading(null);
      }
    },
    [rememberMe],
  );

  /* ── Initialise Google Identity Services ─────────────────────────────────── */
  useEffect(() => {
    if (!isGoogleConfigured()) return;
    initGoogleOneTap(handleSocialLogin);
    const t = setTimeout(() => renderGoogleButton('google-signin-btn'), 500);
    return () => clearTimeout(t);
  }, [handleSocialLogin]);

  /* ── Email / password handler ────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login(email, password, rememberMe);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    'flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10';

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div className="flex min-h-screen bg-[hsl(220,20%,8%)]">
      {/* ─── Left: branding panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[460px] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, hsl(210, 40%, 12%) 0%, hsl(220, 30%, 8%) 100%)' }}>
        {/* decorative blobs */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/8 blur-[100px]" />
        <div className="absolute bottom-20 right-0 h-80 w-80 rounded-full bg-primary/5 blur-[80px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-emerald-500/5 blur-[80px]" />

        {/* logo */}
        <div className="relative z-10 flex items-center gap-3">
          <Logo size={40} color="#ffffff" faceColor="hsl(220, 30%, 10%)" static />
          <span className="text-lg font-bold tracking-tight text-white">ChatBox</span>
        </div>

        {/* heading */}
        <div className="relative z-10">
          <h1 className="text-[36px] font-bold leading-[1.15] tracking-tight text-white">
            Welcome back
          </h1>
          <div className="mt-5 h-1 w-12 rounded-full bg-primary" />
          <p className="mt-6 text-[15px] leading-relaxed text-white/40">
            Sign in to continue to your<br />support dashboard.
          </p>
        </div>

        {/* bottom */}
        <p className="relative z-10 text-xs text-white/20">
          &copy; {new Date().getFullYear()} ChatBox. All rights reserved.
        </p>
      </div>

      {/* ─── Right: form panel ────────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px] animate-scale-in">
          {/* Card */}
          <div className="rounded-2xl bg-white p-8 sm:p-10"
            style={{ boxShadow: '0 25px 60px -12px rgb(0 0 0 / 0.25)' }}>
            {/* Mobile logo */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <Logo size={36} faceColor="#ffffff" static />
              <span className="text-lg font-bold tracking-tight text-gray-900">ChatBox</span>
            </div>

            {/* Desktop heading */}
            <div className="hidden lg:block mb-8">
              <h2 className="text-xl font-bold text-gray-900">Sign in</h2>
              <p className="mt-1 text-sm text-gray-500">Choose your preferred method</p>
            </div>

            {/* ── Social buttons ──────────────────────────────────────────── */}
            <div className="space-y-2.5">
              {isGoogleConfigured() ? (
                <div id="google-signin-btn" className="flex justify-center" />
              ) : (
                <button
                  type="button"
                  disabled={socialLoading === 'google'}
                  onClick={() =>
                    handleSocialLogin({ provider: 'google', providerId: 'demo-google', email: 'admin@chatbox.local', name: 'Google User' })
                  }
                  className={socialBtnClass}
                >
                  {socialLoading === 'google' ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                  Continue with Google
                </button>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={socialLoading === 'facebook'}
                  onClick={() => setError('Facebook login requires configuration. Add NEXT_PUBLIC_FACEBOOK_APP_ID to .env')}
                  className={socialBtnClass}
                >
                  {socialLoading === 'facebook' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FacebookIcon />}
                  <span className="hidden sm:inline">Facebook</span>
                </button>

                <button
                  type="button"
                  disabled={socialLoading === 'apple'}
                  onClick={() => setError('Apple login requires configuration. Add Apple credentials to .env')}
                  className={socialBtnClass}
                >
                  {socialLoading === 'apple' ? <Loader2 className="h-4 w-4 animate-spin" /> : <AppleIcon />}
                  <span className="hidden sm:inline">Apple</span>
                </button>
              </div>
            </div>

            {/* ── Divider ────────────────────────────────────────────────── */}
            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">or</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>

            {/* ── Error ──────────────────────────────────────────────────── */}
            {error && (
              <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 animate-slide-down">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-500 text-[10px] font-bold">!</span>
                {error}
              </div>
            )}

            {/* ── Form ───────────────────────────────────────────────────── */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-xs font-medium text-gray-600">Email</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-xs font-medium text-gray-600">Password</label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Enter password"
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>

              {/* ── Remember me ──────────────────────────────────────────── */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={rememberMe}
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-[5px] border-2 transition-all ${
                    rememberMe
                      ? 'border-primary bg-primary'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  {rememberMe && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5 text-white">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
                <label
                  onClick={() => setRememberMe(!rememberMe)}
                  className="cursor-pointer select-none text-sm text-gray-500"
                >
                  Remember me
                </label>
              </div>

              {/* ── Sign in button ───────────────────────────────────────── */}
              <button
                type="submit"
                disabled={isLoading}
                className="mt-3 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99]"
                style={{ boxShadow: '0 2px 8px 0 hsl(var(--primary) / 0.3)' }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
