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
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
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
        // force full reload so AuthProvider re-reads storage
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
    // small delay so the script has loaded
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

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div className="flex min-h-screen bg-[#0e1525]">
      {/* ─── Left: branding panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[420px] flex-col justify-between bg-[#0c2d48] p-10 relative overflow-hidden">
        {/* decorative blobs */}
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-[#10b981]/10 blur-3xl" />
        <div className="absolute bottom-20 right-0 h-60 w-60 rounded-full bg-[#3b82f6]/10 blur-3xl" />

        {/* logo */}
        <div className="relative z-10 flex items-center gap-3">
          <Logo size={44} color="#ffffff" faceColor="#0c2d48" static />
          <span className="text-xl font-bold tracking-tight text-white">ChatBox</span>
        </div>

        {/* heading */}
        <div className="relative z-10">
          <h1 className="text-[32px] font-bold leading-tight text-white">
            Welcome Back to
            <br />
            ChatBox
          </h1>
          <div className="mt-4 h-1 w-16 rounded-full bg-[#10b981]" />
          <p className="mt-6 text-[15px] leading-relaxed text-white/50">
            Sign in to continue to your
            <br />
            account.
          </p>
        </div>

        {/* bottom spacer */}
        <div />
      </div>

      {/* ─── Right: form panel ────────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px] rounded-2xl bg-white p-8 shadow-xl sm:p-10">
          {/* Mobile logo */}
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <Logo size={38} faceColor="#ffffff" static />
            <span className="text-xl font-bold tracking-tight text-gray-900">ChatBox</span>
          </div>

          {/* ── Social buttons ──────────────────────────────────────────────── */}
          <div className="space-y-3">
            {/* Google — native GIS button, with fallback */}
            {isGoogleConfigured() ? (
              <div id="google-signin-btn" className="flex justify-center" />
            ) : (
              <button
                type="button"
                disabled={socialLoading === 'google'}
                onClick={() =>
                  handleSocialLogin({
                    provider: 'google',
                    providerId: 'demo-google',
                    email: 'admin@chatbox.local',
                    name: 'Google User',
                  })
                }
                className="flex h-[52px] w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                {socialLoading === 'google' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Continue with Google
              </button>
            )}

            <button
              type="button"
              disabled={socialLoading === 'facebook'}
              onClick={() =>
                setError(
                  'Facebook login requires configuration. Add NEXT_PUBLIC_FACEBOOK_APP_ID to .env',
                )
              }
              className="flex h-[52px] w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {socialLoading === 'facebook' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FacebookIcon />
              )}
              Continue with Facebook
            </button>

            <button
              type="button"
              disabled={socialLoading === 'apple'}
              onClick={() =>
                setError(
                  'Apple login requires configuration. Add Apple credentials to .env',
                )
              }
              className="flex h-[52px] w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {socialLoading === 'apple' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <AppleIcon />
              )}
              Continue with Apple
            </button>
          </div>

          {/* ── Divider ─────────────────────────────────────────────────────── */}
          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-medium text-gray-400">or</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* ── Error ───────────────────────────────────────────────────────── */}
          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* ── Email / password form ───────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="Email address"
                className="flex h-[52px] w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]/20"
              />
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Password"
                className="flex h-[52px] w-full rounded-lg border border-gray-200 bg-white px-4 pr-11 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-[18px] w-[18px]" />
                ) : (
                  <Eye className="h-[18px] w-[18px]" />
                )}
              </button>
            </div>

            {/* ── Remember me ───────────────────────────────────────────────── */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                role="checkbox"
                aria-checked={rememberMe}
                onClick={() => setRememberMe(!rememberMe)}
                className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${
                  rememberMe
                    ? 'border-[#10b981] bg-[#10b981]'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                {rememberMe && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3 text-white"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
              <label
                onClick={() => setRememberMe(!rememberMe)}
                className="cursor-pointer select-none text-sm text-gray-600"
              >
                Keep me signed in until I sign out
              </label>
            </div>

            {/* ── Sign in button ─────────────────────────────────────────────── */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-[#10b981] text-sm font-semibold text-white transition-all hover:bg-[#059669] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981]/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
