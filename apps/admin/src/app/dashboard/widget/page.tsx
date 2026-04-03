'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Save, Loader2, Palette, MessageSquare,
  Layout, Zap, Bell, ChevronDown, Bot,
} from 'lucide-react';
import { api, ApiError } from '../../../lib/api';
import { ChatWidgetPreview, type WidgetConfig } from '../../../components/ChatWidgetPreview';
import { Toast } from '../../../components/ui/Toast';
import { Toggle } from '../../../components/ui/Toggle';
import { inputStyles } from '../../../components/ui/Input';

/* ── Types ──────────────────────────────────────────────────────────────────── */

type SectionId = 'branding' | 'colors' | 'layout' | 'behavior' | 'experience' | 'features' | 'ai';

const SECTIONS: { id: SectionId; name: string; icon: typeof Palette }[] = [
  { id: 'branding', name: 'Branding', icon: MessageSquare },
  { id: 'colors', name: 'Colors', icon: Palette },
  { id: 'layout', name: 'Layout', icon: Layout },
  { id: 'behavior', name: 'Behavior', icon: Zap },
  { id: 'experience', name: 'Experience', icon: Bell },
  { id: 'features', name: 'Features', icon: Zap },
  { id: 'ai', name: 'AI', icon: Bot },
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
  featureLiveTyping: true,
  featureSeenStatus: true,
  featureFileUpload: true,
  featureEmoji: true,
  featureSound: true,
  featureChatHistory: true,
  featureEndChat: true,
  featureAiSuggestions: true,
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

      {/* Embed code */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Install on your website</p>
          <button onClick={() => { const el = document.getElementById('embed-code') as HTMLTextAreaElement; el?.select(); document.execCommand('copy'); }}
            className="text-[11px] font-medium text-primary hover:underline">Copy code</button>
        </div>
        <textarea id="embed-code" readOnly rows={2}
          value={`<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget.js" data-key="REPLACE_WITH_YOUR_PUBLIC_KEY"></script>`}
          className="w-full rounded-lg border border-border/50 bg-muted/30 px-3 py-2 font-mono text-[11px] text-muted-foreground resize-none focus:outline-none" />
        <p className="mt-1.5 text-[10px] text-muted-foreground">Add this before the closing &lt;/body&gt; tag on your website. Get your public key from Company settings.</p>
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
              <div>
                <h3 className="font-semibold">Theme</h3>
                <p className="text-xs text-muted-foreground">Pick a primary color. All other colors are auto-generated for perfect contrast and readability.</p>
              </div>
              <ColorInput label="Primary Color" value={config.headerColor} onChange={(v) => {
                set('headerColor', v);
                set('userMessageColor', v);
              }} />
              <div className="rounded-lg border border-dashed border-muted-foreground/20 bg-muted/30 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  The theme engine automatically generates header, button, message bubble, background, and text colors from your primary color with proper contrast ratios.
                </p>
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

          {/* ── FEATURES ──────────────────────────────────────────────────── */}
          {activeSection === 'features' && (
            <div className="rounded-lg border bg-card p-5 shadow-sm space-y-4">
              <div><h3 className="font-semibold">Feature Toggles</h3><p className="text-xs text-muted-foreground">Enable or disable specific widget capabilities</p></div>
              {([
                { key: 'featureLiveTyping' as const, label: 'Live Typing Preview', desc: 'Show what user types in real-time to agents' },
                { key: 'featureSeenStatus' as const, label: 'Seen / Delivered Status', desc: 'Show message delivery and read receipts' },
                { key: 'featureFileUpload' as const, label: 'File Attachments', desc: 'Allow visitors to send images and files' },
                { key: 'featureEmoji' as const, label: 'Emoji Picker', desc: 'Show emoji selector in chat input' },
                { key: 'featureSound' as const, label: 'Sound Notifications', desc: 'Play sound on new messages' },
                { key: 'featureChatHistory' as const, label: 'Chat History', desc: 'Let visitors see previous conversations' },
                { key: 'featureEndChat' as const, label: 'End Chat Button', desc: 'Allow visitors to close conversations' },
                { key: 'featureAiSuggestions' as const, label: 'AI Suggestions', desc: 'Show quick-reply suggestions to agents' },
              ]).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
                  <Toggle enabled={config[key]} onToggle={() => set(key, !config[key])} />
                </div>
              ))}
            </div>
          )}

          {/* ── AI ─────────────────────────────────────────────────────── */}
          {activeSection === 'ai' && <AiSettingsSection />}

          {/* Advanced section removed */}
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

// ── AI Settings Sub-component ──────────────────────────────────────────────

function AiSettingsSection() {
  const [tone, setTone] = useState('friendly');
  const [customPrompt, setCustomPrompt] = useState('');
  const [knowledgeContext, setKnowledgeContext] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get<{ tone: string; customPrompt: string; knowledgeContext: string }>('/settings/ai')
      .then((d) => { setTone(d.tone); setCustomPrompt(d.customPrompt); setKnowledgeContext(d.knowledgeContext); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  async function handleSave() {
    setSaving(true);
    try { await api.patch('/settings/ai', { tone, customPrompt, knowledgeContext }); } catch {}
    finally { setSaving(false); }
  }

  if (!loaded) return <div className="p-5"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm space-y-5">
      <div><h3 className="font-semibold">AI Assistant</h3><p className="text-xs text-muted-foreground">Configure how AI responds to customers</p></div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Tone</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'friendly', label: 'Friendly', desc: 'Warm and conversational' },
            { value: 'professional', label: 'Professional', desc: 'Formal and precise' },
            { value: 'sales', label: 'Sales', desc: 'Enthusiastic and persuasive' },
            { value: 'support', label: 'Support', desc: 'Empathetic and solution-focused' },
          ].map((t) => (
            <button key={t.value} onClick={() => setTone(t.value)}
              className={`rounded-lg border p-3 text-left transition ${tone === t.value ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-input hover:border-primary/30'}`}>
              <p className="text-sm font-medium">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Custom Instructions</label>
        <textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} rows={4}
          placeholder="e.g., Always mention our 30-day trial. Our main product is CloudSync..."
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
        <p className="text-xs text-muted-foreground">Custom instructions the AI follows. Be specific about your product and policies.</p>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Knowledge Context</label>
        <textarea value={knowledgeContext} onChange={(e) => setKnowledgeContext(e.target.value)} rows={6}
          placeholder="Paste FAQ, product info, pricing, policies..."
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
        <p className="text-xs text-muted-foreground">Knowledge the AI uses to answer questions. Max 5000 characters.</p>
      </div>
      <button onClick={handleSave} disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save AI Settings
      </button>
    </div>
  );
}
