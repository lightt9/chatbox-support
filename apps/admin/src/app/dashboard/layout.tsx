'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, MessageSquare, BookOpen, Users, BarChart3,
  ShieldCheck, Settings, Menu, X, Bell, ChevronDown, LogOut,
  User, UserPlus, MessageCircle, Search, PanelLeftClose, PanelLeft,
  Command, Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../../lib/auth';
import { Logo } from '../../components/Logo';

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles?: string[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Conversations', href: '/dashboard/conversations', icon: MessageSquare },
  { name: 'Knowledge Base', href: '/dashboard/knowledge-base', icon: BookOpen, roles: ['super_admin', 'admin', 'manager'] },
  { name: 'Operators', href: '/dashboard/operators', icon: Users, roles: ['super_admin', 'admin', 'manager'] },
  { name: 'Leads', href: '/dashboard/leads', icon: UserPlus, roles: ['super_admin', 'admin', 'manager'] },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3, roles: ['super_admin', 'admin', 'manager'] },
  { name: 'Quality', href: '/dashboard/quality', icon: ShieldCheck, roles: ['super_admin', 'admin', 'manager'] },
  { name: 'Chat Widget', href: '/dashboard/widget', icon: MessageCircle, roles: ['super_admin', 'admin'] },
  { name: 'Companies', href: '/dashboard/companies', icon: Building2, roles: ['super_admin'] },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['super_admin', 'admin'] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isLoading, isAuthenticated, router]);

  // Load collapsed preference
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  }

  const [impersonatingLabel, setImpersonatingLabel] = useState<string | null>(null);

  useEffect(() => {
    const label = localStorage.getItem('impersonating');
    if (label && label !== 'false') setImpersonatingLabel(label);
  }, []);

  function exitImpersonation() {
    const adminAccess = localStorage.getItem('_admin_accessToken');
    const adminRefresh = localStorage.getItem('_admin_refreshToken');
    const adminUser = localStorage.getItem('_admin_user');
    if (adminAccess) {
      localStorage.setItem('accessToken', adminAccess);
      if (adminRefresh) localStorage.setItem('refreshToken', adminRefresh);
      if (adminUser) localStorage.setItem('user', adminUser);
    }
    localStorage.removeItem('_admin_accessToken');
    localStorage.removeItem('_admin_refreshToken');
    localStorage.removeItem('_admin_user');
    localStorage.removeItem('impersonating');
    window.location.href = '/dashboard/companies';
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const displayName = user?.name ?? 'User';
  const displayEmail = user?.email ?? '';
  const initials = displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const filteredNav = navigation.filter((item) => !item.roles || (user?.role && item.roles.includes(user.role)));

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Impersonation banner */}
      {impersonatingLabel && (
        <div className="flex items-center justify-between bg-amber-500 px-4 py-1.5 text-[12px] font-medium text-white">
          <span>Viewing as: <strong>{impersonatingLabel}</strong></span>
          <button onClick={exitImpersonation} className="cursor-pointer rounded-md bg-white/20 px-3 py-0.5 text-[11px] font-semibold transition hover:bg-white/30 active:scale-[0.98]">
            Exit
          </button>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[var(--z-overlay)] bg-black/50 backdrop-blur-sm transition-opacity lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:static',
          collapsed ? 'lg:w-[68px]' : 'lg:w-[250px]',
          mobileOpen ? 'w-[250px] translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        )}
        style={{
          background: 'hsl(var(--card))',
          borderRight: '1px solid hsl(var(--border) / 0.4)',
        }}
      >
        {/* Logo */}
        <div className={cn('flex h-[60px] items-center', collapsed ? 'justify-center px-2' : 'justify-between px-5')}>
          <Link href="/dashboard" className="flex items-center gap-2.5 group" onClick={() => setMobileOpen(false)}>
            <Logo size={28} faceColor="hsl(var(--card))" />
            {!collapsed && <span className="text-[15px] font-extrabold tracking-tight transition-colors group-hover:text-primary">ChatBox</span>}
          </Link>
          {!collapsed && (
            <button onClick={() => setMobileOpen(false)} className="cursor-pointer rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors lg:hidden">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {filteredNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.name : undefined}
                className={cn(
                  'group relative flex items-center rounded-xl text-[13px] font-medium transition-all duration-150',
                  collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2',
                  isActive
                    ? 'bg-primary/10 text-primary dark:bg-primary/15 font-semibold'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                <item.icon className={cn('flex-shrink-0 transition-colors', collapsed ? 'h-5 w-5' : 'h-[18px] w-[18px]')} strokeWidth={isActive ? 2.2 : 1.8} />
                {!collapsed && <span>{item.name}</span>}
                {/* Active indicator — soft glow bar */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.5)]" />
                )}
                {/* Tooltip for collapsed */}
                {collapsed && (
                  <div className="pointer-events-none absolute left-full z-50 ml-3 hidden animate-fade-in rounded-lg bg-popover px-3 py-1.5 text-xs font-medium text-popover-foreground ring-1 ring-border/50 group-hover:block"
                    style={{ boxShadow: 'var(--shadow-lg)' }}>
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle + user */}
        <div className="p-3 space-y-1" style={{ borderTop: '1px solid hsl(var(--border) / 0.4)' }}>
          {/* Collapse toggle - desktop only */}
          <button
            onClick={toggleCollapse}
            className="hidden w-full cursor-pointer items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground lg:flex"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>

          {/* User */}
          <div className={cn('flex items-center gap-2.5 rounded-xl p-2 transition-colors hover:bg-muted/40', collapsed && 'justify-center')}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/25 to-violet-500/10 text-xs font-bold text-primary ring-1 ring-primary/10">
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium leading-tight">{displayName}</p>
                <p className="truncate text-[11px] text-muted-foreground">{displayEmail}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-[60px] items-center justify-between bg-card px-4 lg:px-6"
          style={{ borderBottom: '1px solid hsl(var(--border) / 0.4)' }}>
          {/* Left: mobile menu + search */}
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="cursor-pointer rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors lg:hidden">
              <Menu className="h-5 w-5" />
            </button>

            {/* Search */}
            <div className={cn(
              'hidden items-center gap-2 rounded-lg border px-3.5 py-2 transition-all duration-200 md:flex',
              searchFocused
                ? 'w-80 border-primary/30 bg-background ring-2 ring-primary/10'
                : 'w-64 border-border/50 bg-muted/30 hover:bg-muted/50'
            )}>
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                aria-label="Search conversations"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              <kbd className="hidden rounded-md border border-border/50 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline-flex lg:items-center lg:gap-0.5">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </div>
          </div>

          {/* Right: notifications + user */}
          <div className="flex items-center gap-1.5">
            <button className="relative cursor-pointer rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Notifications">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
              </span>
            </button>

            {/* Separator */}
            <div className="mx-1 h-6 w-px bg-border/50" />

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary/25 to-violet-500/10 text-[11px] font-bold text-primary ring-1 ring-primary/10">
                  {initials}
                </div>
                <span className="hidden text-[13px] font-medium md:block">{displayName}</span>
                <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform duration-200', userMenuOpen && 'rotate-180')} />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-56 animate-slide-down rounded-xl border border-border/50 bg-popover p-1.5"
                    style={{ boxShadow: 'var(--shadow-xl)' }}>
                    <div className="px-3 py-2.5 mb-1" style={{ borderBottom: '1px solid hsl(var(--border) / 0.4)' }}>
                      <p className="text-[13px] font-semibold">{displayName}</p>
                      <p className="text-[11px] text-muted-foreground">{displayEmail}</p>
                    </div>
                    <Link href="/dashboard/settings" onClick={() => setUserMenuOpen(false)} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                      <Settings className="h-4 w-4" /> Settings
                    </Link>
                    <button onClick={() => { setUserMenuOpen(false); logout(); }} className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-7">
          <div className="page-enter">{children}</div>
        </main>
      </div>
      </div>
    </div>
  );
}
