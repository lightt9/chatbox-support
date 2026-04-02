'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Save,
  Globe,
  Bell,
  Shield,
  Palette,
  Loader2,
  Check,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { api, ApiError } from '../../../lib/api';
import { useTheme, COLOR_MAP, type ColorName, type ThemeName } from '../../../lib/theme';
import { Logo } from '../../../components/Logo';
import { Toast } from '../../../components/ui/Toast';
import { Toggle } from '../../../components/ui/Toggle';
import { inputStyles } from '../../../components/ui/Input';

/* ── Types ──────────────────────────────────────────────────────────────────── */

interface GeneralSettings {
  platformName: string;
  supportEmail: string;
  defaultLanguage: string;
  timezone: string;
}

interface NotificationSettings {
  newConversations: boolean;
  escalations: boolean;
  browserPush: boolean;
  dailySummary: boolean;
  weeklyReports: boolean;
}

interface SecuritySettings {
  sessionTimeout: number;
  require2fa: boolean;
  enableSso: boolean;
}

interface AppearanceSettings {
  theme: string;
  primaryColor: string;
}

interface ProfileInfo {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  authProvider: string;
}

interface AllSettings {
  general: GeneralSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  appearance: AppearanceSettings;
  profile: ProfileInfo | null;
}

/* ── Notification labels ────────────────────────────────────────────────────── */

const notificationLabels: { key: keyof NotificationSettings; label: string }[] =
  [
    { key: 'newConversations', label: 'Email notifications for new conversations' },
    { key: 'escalations', label: 'Email notifications for escalations' },
    { key: 'browserPush', label: 'Browser push notifications' },
    { key: 'dailySummary', label: 'Daily summary email' },
    { key: 'weeklyReports', label: 'Weekly reports email' },
  ];

/* ── Color options ──────────────────────────────────────────────────────────── */

const colorOptions: { value: ColorName; label: string }[] = [
  { value: 'blue', label: 'Blue' },
  { value: 'purple', label: 'Purple' },
  { value: 'green', label: 'Green' },
  { value: 'orange', label: 'Orange' },
  { value: 'red', label: 'Red' },
  { value: 'pink', label: 'Pink' },
];

/* ── Sections ───────────────────────────────────────────────────────────────── */

const settingsSections = [
  { id: 'general', name: 'General', icon: Globe },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'security', name: 'Security', icon: Shield },
  { id: 'appearance', name: 'Appearance', icon: Palette },
];

const inputCls = `${inputStyles} max-w-md`;

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const { primaryHex, setTheme: applyTheme, setPrimaryColor: applyColor } = useTheme();

  /* ── Settings state ─────────────────────────────────────────────────────── */
  const [general, setGeneral] = useState<GeneralSettings>({
    platformName: '',
    supportEmail: '',
    defaultLanguage: 'en',
    timezone: 'UTC',
  });
  const [notifications, setNotifications] = useState<NotificationSettings>({
    newConversations: true,
    escalations: true,
    browserPush: false,
    dailySummary: false,
    weeklyReports: true,
  });
  const [security, setSecurity] = useState<SecuritySettings>({
    sessionTimeout: 30,
    require2fa: false,
    enableSso: false,
  });
  const [appearance, setAppearance] = useState<AppearanceSettings>({
    theme: 'light',
    primaryColor: 'blue',
  });
  const [profile, setProfile] = useState<ProfileInfo | null>(null);

  /* ── Password change state ──────────────────────────────────────────────── */
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  /* ── Load settings ──────────────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<AllSettings>('/settings');
        if (cancelled) return;
        setGeneral(data.general);
        setNotifications(data.notifications);
        setSecurity(data.security);
        setAppearance(data.appearance);
        applyTheme(data.appearance.theme as ThemeName);
        applyColor(data.appearance.primaryColor as ColorName);
        setProfile(data.profile);
      } catch {
        setToast({ message: 'Failed to load settings', type: 'error' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Save helper ────────────────────────────────────────────────────────── */
  const save = useCallback(
    async (section: string, endpoint: string, data: unknown) => {
      setSaving(section);
      try {
        const result = await api.patch<Record<string, any>>(endpoint, data);
        setToast({ message: 'Settings saved', type: 'success' });
        return result;
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : 'Failed to save settings';
        setToast({ message: msg, type: 'error' });
        return null;
      } finally {
        setSaving(null);
      }
    },
    [],
  );

  /* ── Save handlers ──────────────────────────────────────────────────────── */
  const saveGeneral = async () => {
    const result = await save('general', '/settings/general', general);
    if (result) setGeneral(result as unknown as GeneralSettings);
  };

  const saveNotifications = async () => {
    const result = await save(
      'notifications',
      '/settings/notifications',
      notifications,
    );
    if (result) {
      setNotifications((prev) => ({ ...prev, ...result }));
    }
  };

  const saveSecurity = async () => {
    const result = await save('security', '/settings/security', security);
    if (result) {
      setSecurity((prev) => ({ ...prev, ...result }));
    }
  };

  const saveAppearance = async () => {
    const result = await save(
      'appearance',
      '/settings/appearance',
      appearance,
    );
    if (result) {
      setAppearance((prev) => ({ ...prev, ...result }));
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setToast({ message: 'Passwords do not match', type: 'error' });
      return;
    }
    if (newPassword.length < 8) {
      setToast({
        message: 'Password must be at least 8 characters',
        type: 'error',
      });
      return;
    }
    setSaving('password');
    try {
      await api.post('/settings/change-password', {
        currentPassword,
        newPassword,
      });
      setToast({ message: 'Password changed successfully', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Failed to change password';
      setToast({ message: msg, type: 'error' });
    } finally {
      setSaving(null);
    }
  };

  /* ── Save button component ──────────────────────────────────────────────── */
  const SaveButton = ({ section, onClick }: { section: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      disabled={saving === section}
      className="btn-primary"
    >
      {saving === section ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      {saving === section ? 'Saving...' : 'Save Changes'}
    </button>
  );

  /* ── Loading state ──────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your platform configuration and preferences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Settings navigation */}
        <div className="space-y-1">
          {settingsSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-out ${
                activeSection === section.id
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-0.5'
              }`}
            >
              <section.icon className="h-4 w-4" />
              {section.name}
            </button>
          ))}
        </div>

        {/* Settings content */}
        <div className="lg:col-span-3 space-y-6">
          {/* ── GENERAL ───────────────────────────────────────────────────── */}
          {activeSection === 'general' && (
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold">General Settings</h3>
              <p className="text-sm text-muted-foreground">
                Configure your platform-wide settings
              </p>

              <div className="mt-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Platform Name</label>
                  <input
                    type="text"
                    value={general.platformName}
                    onChange={(e) =>
                      setGeneral({ ...general, platformName: e.target.value })
                    }
                    className={inputCls}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Support Email</label>
                  <input
                    type="email"
                    value={general.supportEmail}
                    onChange={(e) =>
                      setGeneral({ ...general, supportEmail: e.target.value })
                    }
                    placeholder="support@company.com"
                    className={inputCls}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Default Language
                  </label>
                  <select
                    value={general.defaultLanguage}
                    onChange={(e) =>
                      setGeneral({
                        ...general,
                        defaultLanguage: e.target.value,
                      })
                    }
                    className={inputCls}
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Timezone</label>
                  <select
                    value={general.timezone}
                    onChange={(e) =>
                      setGeneral({ ...general, timezone: e.target.value })
                    }
                    className={inputCls}
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="America/Chicago">America/Chicago</option>
                    <option value="America/Los_Angeles">
                      America/Los_Angeles
                    </option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="Europe/Berlin">Europe/Berlin</option>
                  </select>
                </div>

                <SaveButton section="general" onClick={saveGeneral} />
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ─────────────────────────────────────────────── */}
          {activeSection === 'notifications' && (
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Notification Settings</h3>
              <p className="text-sm text-muted-foreground">
                Configure how you receive notifications
              </p>

              <div className="mt-6 space-y-4">
                {notificationLabels.map(({ key, label }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-lg border px-4 py-3 transition-all duration-200 hover:bg-muted/30 hover:shadow-sm"
                  >
                    <span className="text-sm">{label}</span>
                    <Toggle
                      enabled={notifications[key]}
                      onToggle={() =>
                        setNotifications({
                          ...notifications,
                          [key]: !notifications[key],
                        })
                      }
                    />
                  </div>
                ))}

                <SaveButton
                  section="notifications"
                  onClick={saveNotifications}
                />
              </div>
            </div>
          )}

          {/* ── SECURITY ──────────────────────────────────────────────────── */}
          {activeSection === 'security' && (
            <>
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold">Security Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Manage authentication and security options
                </p>

                <div className="mt-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Session Timeout (minutes)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={480}
                      value={security.sessionTimeout}
                      onChange={(e) =>
                        setSecurity({
                          ...security,
                          sessionTimeout: parseInt(e.target.value, 10) || 30,
                        })
                      }
                      className={inputCls}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border px-4 py-3 max-w-md transition-all duration-200 hover:bg-muted/30 hover:shadow-sm">
                    <span className="text-sm">Require 2FA for all users</span>
                    <Toggle
                      enabled={security.require2fa}
                      onToggle={() =>
                        setSecurity({
                          ...security,
                          require2fa: !security.require2fa,
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border px-4 py-3 max-w-md transition-all duration-200 hover:bg-muted/30 hover:shadow-sm">
                    <span className="text-sm">Enable SSO</span>
                    <Toggle
                      enabled={security.enableSso}
                      onToggle={() =>
                        setSecurity({
                          ...security,
                          enableSso: !security.enableSso,
                        })
                      }
                    />
                  </div>

                  <SaveButton section="security" onClick={saveSecurity} />
                </div>
              </div>

              {/* Password change */}
              {profile?.authProvider === 'local' && (
                <div className="rounded-lg border bg-card p-6 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Change Password</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Update your account password
                  </p>

                  <div className="mt-6 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Current Password
                      </label>
                      <div className="relative max-w-md">
                        <input
                          type={showCurrentPw ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          className={`${inputCls} max-w-none pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPw(!showCurrentPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showCurrentPw ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        New Password
                      </label>
                      <div className="relative max-w-md">
                        <input
                          type={showNewPw ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Minimum 8 characters"
                          className={`${inputCls} max-w-none pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPw(!showNewPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showNewPw ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className={inputCls}
                      />
                      {confirmPassword.length > 0 &&
                        newPassword !== confirmPassword && (
                          <p className="text-xs text-red-500">
                            Passwords do not match
                          </p>
                        )}
                    </div>

                    <button
                      onClick={handleChangePassword}
                      disabled={
                        saving === 'password' ||
                        !currentPassword ||
                        !newPassword ||
                        newPassword !== confirmPassword
                      }
                      className="btn-primary"
                    >
                      {saving === 'password' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                      {saving === 'password'
                        ? 'Changing...'
                        : 'Change Password'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── APPEARANCE ────────────────────────────────────────────────── */}
          {activeSection === 'appearance' && (
            <div className="space-y-6">
              {/* Live preview */}
              <div
                className="rounded-lg border bg-card p-6 shadow-sm transition-all duration-500"
                style={{ boxShadow: `0 0 40px ${primaryHex}15` }}
              >
                <div className="flex flex-col items-center gap-4">
                  <Logo size={72} faceColor="hsl(var(--card))" />
                  <div className="text-center">
                    <h2 className="text-2xl font-bold tracking-tight">ChatBox</h2>
                    <p className="text-sm text-muted-foreground">Live preview of your theme</p>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-2.5 w-20 rounded-full bg-primary transition-colors duration-500" />
                    <div className="h-2.5 w-14 rounded-full bg-primary/40 transition-colors duration-500" />
                    <div className="h-2.5 w-10 rounded-full bg-primary/20 transition-colors duration-500" />
                  </div>
                </div>
              </div>

              {/* Settings card */}
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold">Appearance Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Customize the look and feel of your admin panel
                </p>

                <div className="mt-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Theme</label>
                    <div className="flex gap-3">
                      {(['light', 'dark', 'system'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => {
                            setAppearance({ ...appearance, theme: t });
                            applyTheme(t as ThemeName);
                          }}
                          className={`rounded-md px-4 py-2 text-sm font-medium capitalize transition-all duration-200 ${
                            appearance.theme === t
                              ? 'border-2 border-primary bg-primary/5'
                              : 'border border-input hover:border-primary/50'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Primary Color</label>
                    <div className="flex gap-3">
                      {colorOptions.map(({ value }) => {
                        const hex = COLOR_MAP[value].hex;
                        const isSelected = appearance.primaryColor === value;
                        return (
                          <button
                            key={value}
                            onClick={() => {
                              setAppearance({ ...appearance, primaryColor: value });
                              applyColor(value);
                            }}
                            className={`relative h-8 w-8 rounded-full ring-2 ring-offset-2 transition-all duration-200 ${
                              isSelected ? 'ring-primary' : 'ring-transparent'
                            }`}
                            style={{ backgroundColor: hex }}
                          >
                            {isSelected && (
                              <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <SaveButton section="appearance" onClick={saveAppearance} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
