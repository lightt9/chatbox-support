'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Save, Loader2, Palette, MessageSquare,
  Layout, Zap, Bell, Code, ChevronDown,
} from 'lucide-react';
import { api, ApiError } from '../../../lib/api';
import { ChatWidgetPreview, type WidgetConfig } from '../../../components/ChatWidgetPreview';
import { Toast } from '../../../components/ui/Toast';
import { Toggle } from '../../../components/ui/Toggle';
import { inputStyles } from '../../../components/ui/Input';

/* ── Types ──────────────────────────────────────────────────────────────────── */

type SectionId = 'branding' | 'colors' | 'layout' | 'behavior' | 'experience' | 'advanced';

const SECTIONS: { id: SectionId; name: string; icon: typeof Palette }[] = [
  { id: 'branding', name: 'Branding', icon: MessageSquare },
  { id: 'colors', name: 'Colors', icon: Palette },
  { id: 'layout', name: 'Layout', icon: Layout },
  { id: 'behavior', name: 'Behavior', icon: Zap },
  { id: 'experience', name: 'Experience', icon: Bell },
  { id: 'advanced', name: 'Advanced', icon: Code },
];

const DEFAULTS: WidgetConfig = {
  companyName: 'ChatBox',
  welcomeMessage: 'Hi there! How can we help you today?',
  botAvatarUrl: '',
  headerColor: '#3b82f6',
  userMessageColor: '#3b82f6',
  botMessageColor: '#f1f5f9',
  chatBackground: '#ffffff',
  widgetPosition: 'right',
  widgetSize: 'medium',
  borderRadius: 16,
  autoOpenEnabled: false,
  autoOpenDelay: 5,
  soundEnabled: true,
  notificationBadge: true,
  pulseAnimation: true,
  customCSS: '',
};

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded-md border border-input p-0.5" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="h-9 w-24 rounded-md border border-input bg-background px-2 text-xs font-mono uppercase" />
      </div>
    </div>
  );
}

const inputCls = inputStyles;

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function WidgetSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>('branding');
  const [config, setConfig] = useState<WidgetConfig>(DEFAULTS);

  const set = useCallback(<K extends keyof WidgetConfig>(key: K, value: WidgetConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<{ widget: WidgetConfig }>('/settings');
        if (cancelled) return;
        setConfig({ ...DEFAULTS, ...(data.widget ?? {}) });
      } catch {
        setToast({ message: 'Failed to load widget settings', type: 'error' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await api.patch<WidgetConfig>('/settings/widget', config);
      setConfig({ ...DEFAULTS, ...result });
      setToast({ message: 'Widget settings saved', type: 'success' });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to save';
      setToast({ message: msg, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chat Widget</h1>
          <p className="text-muted-foreground">Customize your customer-facing chat widget</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* ── Left: Settings ────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Section tabs */}
          <div className="flex flex-wrap gap-1.5">
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  activeSection === s.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}>
                <s.icon className="h-3.5 w-3.5" />{s.name}
              </button>
            ))}
          </div>

          {/* ── BRANDING ─────────────────────────────────────────────────── */}
          {activeSection === 'branding' && (
            <div className="rounded-lg border bg-card p-5 shadow-sm space-y-5">
              <div><h3 className="font-semibold">Branding</h3><p className="text-xs text-muted-foreground">Your company identity in the widget</p></div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Company Name</label>
                <input type="text" value={config.companyName} onChange={(e) => set('companyName', e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Welcome Message</label>
                <textarea value={config.welcomeMessage} onChange={(e) => set('welcomeMessage', e.target.value)}
                  rows={3} className={`${inputCls} h-auto resize-none`} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Bot Avatar URL</label>
                <input type="text" value={config.botAvatarUrl} onChange={(e) => set('botAvatarUrl', e.target.value)}
                  placeholder="https://..." className={inputCls} />
                <p className="text-xs text-muted-foreground">Leave empty to use the company initial</p>
              </div>
            </div>
          )}

          {/* ── COLORS ───────────────────────────────────────────────────── */}
          {activeSection === 'colors' && (
            <div className="rounded-lg border bg-card p-5 shadow-sm space-y-5">
              <div><h3 className="font-semibold">Colors</h3><p className="text-xs text-muted-foreground">Customize every color of your widget</p></div>
              <div className="grid grid-cols-2 gap-4">
                <ColorInput label="Header / Button" value={config.headerColor} onChange={(v) => set('headerColor', v)} />
                <ColorInput label="User Messages" value={config.userMessageColor} onChange={(v) => set('userMessageColor', v)} />
                <ColorInput label="Bot Messages" value={config.botMessageColor} onChange={(v) => set('botMessageColor', v)} />
                <ColorInput label="Chat Background" value={config.chatBackground} onChange={(v) => set('chatBackground', v)} />
              </div>
            </div>
          )}

          {/* ── LAYOUT ───────────────────────────────────────────────────── */}
          {activeSection === 'layout' && (
            <div className="rounded-lg border bg-card p-5 shadow-sm space-y-5">
              <div><h3 className="font-semibold">Layout</h3><p className="text-xs text-muted-foreground">Position, size, and shape</p></div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Position</label>
                <div className="flex gap-2">
                  {(['left', 'right'] as const).map((p) => (
                    <button key={p} onClick={() => set('widgetPosition', p)}
                      className={`rounded-md px-4 py-2 text-sm font-medium capitalize transition-all duration-200 ${
                        config.widgetPosition === p ? 'border-2 border-primary bg-primary/5' : 'border border-input hover:border-primary/50'
                      }`}>{p}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Size</label>
                <div className="flex gap-2">
                  {(['small', 'medium', 'large'] as const).map((s) => (
                    <button key={s} onClick={() => set('widgetSize', s)}
                      className={`rounded-md px-4 py-2 text-sm font-medium capitalize transition-all duration-200 ${
                        config.widgetSize === s ? 'border-2 border-primary bg-primary/5' : 'border border-input hover:border-primary/50'
                      }`}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Border Radius: {config.borderRadius}px</label>
                <input type="range" min={0} max={24} value={config.borderRadius}
                  onChange={(e) => set('borderRadius', parseInt(e.target.value, 10))}
                  className="w-full accent-primary" />
              </div>
            </div>
          )}

          {/* ── BEHAVIOR ─────────────────────────────────────────────────── */}
          {activeSection === 'behavior' && (
            <div className="rounded-lg border bg-card p-5 shadow-sm space-y-5">
              <div><h3 className="font-semibold">Behavior</h3><p className="text-xs text-muted-foreground">How the widget opens and triggers</p></div>
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div><p className="text-sm font-medium">Auto-open widget</p><p className="text-xs text-muted-foreground">Automatically open after a delay</p></div>
                <Toggle enabled={config.autoOpenEnabled} onToggle={() => set('autoOpenEnabled', !config.autoOpenEnabled)} />
              </div>
              {config.autoOpenEnabled && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Delay: {config.autoOpenDelay}s</label>
                  <input type="range" min={1} max={30} value={config.autoOpenDelay}
                    onChange={(e) => set('autoOpenDelay', parseInt(e.target.value, 10))}
                    className="w-full accent-primary" />
                </div>
              )}
            </div>
          )}

          {/* ── EXPERIENCE ───────────────────────────────────────────────── */}
          {activeSection === 'experience' && (
            <div className="rounded-lg border bg-card p-5 shadow-sm space-y-4">
              <div><h3 className="font-semibold">Experience</h3><p className="text-xs text-muted-foreground">Sounds, badges, and animations</p></div>
              {([
                { key: 'soundEnabled' as const, label: 'Message sound', desc: 'Play a sound on new messages' },
                { key: 'notificationBadge' as const, label: 'Notification badge', desc: 'Show unread count on bubble' },
                { key: 'pulseAnimation' as const, label: 'Pulse animation', desc: 'Pulsing ring on the bubble' },
              ]).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
                  <Toggle enabled={config[key]} onToggle={() => set(key, !config[key])} />
                </div>
              ))}
            </div>
          )}

          {/* ── ADVANCED ─────────────────────────────────────────────────── */}
          {activeSection === 'advanced' && (
            <div className="rounded-lg border bg-card p-5 shadow-sm space-y-5">
              <div><h3 className="font-semibold">Advanced</h3><p className="text-xs text-muted-foreground">Custom CSS for power users</p></div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Custom CSS</label>
                <textarea value={config.customCSS} onChange={(e) => set('customCSS', e.target.value)}
                  rows={8} placeholder=".chatbox-widget { /* your styles */ }"
                  className={`${inputCls} h-auto resize-none font-mono text-xs`} />
                <p className="text-xs text-muted-foreground">Scoped to the widget container. Max 5000 characters.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Live Preview ───────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Live Preview</h3>
            <span className="text-xs text-muted-foreground">Changes update instantly</span>
          </div>
          <div className="rounded-xl border bg-muted/30 p-6 flex items-start justify-center min-h-[580px]"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
            <ChatWidgetPreview config={config} />
          </div>
        </div>
      </div>
    </div>
  );
}
