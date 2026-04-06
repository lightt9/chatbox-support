'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare, X, Send, User, Bot, Loader2,
  Star, Clock, ChevronLeft, CheckCheck, ArrowDown,
  Zap, HelpCircle, DollarSign, Users, Volume2,
  Paperclip, Smile, FileText, Download, Image as ImageIcon,
} from 'lucide-react';

// ── Config ─────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || '';
const COMPANY_ID = (typeof window !== 'undefined' && (window as any).__CHATBOX_COMPANY_ID) || process.env.NEXT_PUBLIC_WIDGET_COMPANY_ID || '';
const IS_EMBEDDED = typeof window !== 'undefined' && !!(window as any).__CHATBOX_EMBEDDED;
const STORAGE_KEY = 'chatbox_widget_session';
const CONFIG_CACHE_KEY = 'chatbox_widget_config';
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── Types ──────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  conversationId: string;
  senderType: 'customer' | 'ai' | 'agent' | 'system';
  senderName: string;
  body: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdAt: string;
}

interface Session {
  conversationId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

interface PastConversation {
  id: string;
  customerName: string;
  status: string;
  subject: string | null;
  lastMessage: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface WidgetConfig {
  companyName: string;
  welcomeMessage: string;
  botAvatarUrl: string;
  headerColor: string;
  userMessageColor: string;
  botMessageColor: string;
  chatBackground: string;
  widgetPosition: string;
  widgetSize: string;
  borderRadius: number;
  autoOpenEnabled: boolean;
  autoOpenDelay: number;
  soundEnabled: boolean;
  notificationBadge: boolean;
  pulseAnimation: boolean;
  preChatFormEnabled: boolean;
  preChatNameRequired: boolean;
  preChatEmailRequired: boolean;
  preChatPhoneEnabled: boolean;
  customCSS: string;
  featureLiveTyping: boolean;
  featureSeenStatus: boolean;
  featureFileUpload: boolean;
  featureEmoji: boolean;
  featureSound: boolean;
  featureChatHistory: boolean;
  featureEndChat: boolean;
  featureAiSuggestions: boolean;
}

const DEFAULT_CONFIG: WidgetConfig = {
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
  preChatFormEnabled: true,
  preChatNameRequired: true,
  preChatEmailRequired: true,
  preChatPhoneEnabled: false,
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

type WidgetView = 'home' | 'chat' | 'history' | 'prechat' | 'rating';

// ── Theme Engine ───────────────────────────────────────────────────────────

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v * 255)));
  if (s === 0) { const v = clamp(l); return `#${v.toString(16).padStart(2,'0').repeat(3)}`; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hn = h / 360;
  return '#' + [hue2rgb(p, q, hn + 1/3), hue2rgb(p, q, hn), hue2rgb(p, q, hn - 1/3)].map(v => clamp(v).toString(16).padStart(2, '0')).join('');
}

interface WidgetTheme {
  // Header
  headerBg: string;
  headerText: string;
  headerSubtext: string;
  // Bubble button
  bubbleBg: string;
  // User messages
  userBubbleBg: string;
  userBubbleText: string;
  // Bot messages
  botBubbleBg: string;
  botBubbleText: string;
  // Chat area
  chatBg: string;
  // Input area
  inputBg: string;
  inputBorder: string;
  inputText: string;
  // Send button
  sendBg: string;
  sendText: string;
  // Accents
  accentSoft: string; // for subtle highlights
  accentHover: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
}

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toL = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toL(r) + 0.7152 * toL(g) + 0.0722 * toL(b);
}

function generateTheme(primaryHex: string): WidgetTheme {
  if (!primaryHex || !/^#[0-9a-fA-F]{6}$/.test(primaryHex)) primaryHex = '#3b82f6';

  const { h, s, l } = hexToHSL(primaryHex);
  const lum = relativeLuminance(primaryHex);

  // Use luminance for reliable text contrast. Below 0.35 = use white text.
  const needsWhiteText = lum < 0.35;

  // Generate shades
  const primary = primaryHex;
  const primaryDark = hslToHex(h, Math.min(s * 1.1, 1), Math.max(l - 0.12, 0.15));
  const primaryLight = hslToHex(h, Math.max(s * 0.6, 0.1), Math.min(l + 0.3, 0.95));
  const primarySoft = hslToHex(h, Math.max(s * 0.3, 0.05), 0.96);
  const primaryHover = hslToHex(h, Math.min(s * 1.05, 1), Math.max(l - 0.06, 0.2));

  return {
    // Header: gradient from primary to slightly darker
    headerBg: primary,
    headerText: !needsWhiteText ? '#1a1a2e' : '#ffffff',
    headerSubtext: !needsWhiteText ? 'rgba(26,26,46,0.6)' : 'rgba(255,255,255,0.7)',

    // Bubble button
    bubbleBg: primary,

    // User messages: primary with good text contrast
    userBubbleBg: primary,
    userBubbleText: !needsWhiteText ? '#1a1a2e' : '#ffffff',

    // Bot messages: neutral, always readable
    botBubbleBg: '#ffffff',
    botBubbleText: '#1e293b',

    // Chat area: subtle tinted background
    chatBg: primarySoft,

    // Input
    inputBg: '#f8fafc',
    inputBorder: '#e2e8f0',
    inputText: '#0f172a',

    // Send button
    sendBg: primary,
    sendText: !needsWhiteText ? '#1a1a2e' : '#ffffff',

    // Accents
    accentSoft: primaryLight,
    accentHover: primaryHover,

    // Text (always dark for readability on light backgrounds)
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getVisitorData() {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let os = 'Unknown';
  let device: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (/Chrome/.test(ua) && !/Edg/.test(ua)) browser = 'Chrome';
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
  else if (/Firefox/.test(ua)) browser = 'Firefox';
  else if (/Edg/.test(ua)) browser = 'Edge';
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad/.test(ua)) os = 'iOS';
  if (/Mobi/.test(ua)) device = 'mobile';
  else if (/Tablet|iPad/.test(ua)) device = 'tablet';
  return { browser, os, device, userAgent: ua };
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDate(ts: string): string {
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSession(session: Session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.setValueAtTime(1047, ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.3);
  } catch { /* audio not available */ }
}

async function fetchWidgetConfig(companyId: string): Promise<WidgetConfig> {
  // Check cache first
  try {
    const cached = localStorage.getItem(CONFIG_CACHE_KEY);
    if (cached) {
      const { config, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CONFIG_CACHE_TTL) {
        return { ...DEFAULT_CONFIG, ...config };
      }
    }
  } catch { /* ignore */ }

  // Fetch from API
  try {
    const res = await fetch(`${API_URL}/chat/widget-config`, {
      headers: { 'X-Company-Id': companyId },
    });
    if (res.ok) {
      const config = await res.json();
      // Cache it
      localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify({ config, timestamp: Date.now() }));
      return { ...DEFAULT_CONFIG, ...config };
    }
  } catch { /* ignore */ }

  return DEFAULT_CONFIG;
}

// ── Socket.IO ──────────────────────────────────────────────────────────────

let socketInstance: any = null;

async function getSocket() {
  if (socketInstance?.connected) return socketInstance;
  const { io } = await import('socket.io-client');
  socketInstance = io(`${WS_URL}/chat`, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });
  return socketInstance;
}

// ── Quick Replies ──────────────────────────────────────────────────────────

const QUICK_REPLIES = [
  { label: 'Pricing info', icon: DollarSign, message: "I'd like to know about your pricing plans.", color: 'from-blue-500 to-blue-600' },
  { label: 'Technical support', icon: HelpCircle, message: 'I need help with a technical issue.', color: 'from-violet-500 to-purple-600' },
  { label: 'Talk to a human', icon: Users, message: 'I would like to speak with a human agent.', color: 'from-emerald-500 to-green-600' },
];

// ── Widget ─────────────────────────────────────────────────────────────────

export function ChatWidget() {
  const [config, setConfig] = useState<WidgetConfig>(DEFAULT_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);
  const theme = generateTheme(config.headerColor);
  const [isOpen, setIsOpen] = useState(IS_EMBEDDED);
  const [view, setView] = useState<WidgetView>('prechat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState<{ senderType: string; senderName?: string } | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [seenByAgent, setSeenByAgent] = useState(false);
  const [lastSeenAgentName, setLastSeenAgentName] = useState<string | null>(null);
  const [companyId] = useState(COMPANY_ID);
  const [pastConvs, setPastConvs] = useState<PastConversation[]>([]);
  const [conversationStatus, setConversationStatus] = useState<string>('open');
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [autoMessageShown, setAutoMessageShown] = useState(false);
  const [quickRepliesUsed, setQuickRepliesUsed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFilePreview, setPendingFilePreview] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<any>(null);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const viewRef = useRef(view);
  viewRef.current = view;
  const stopPreviewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Init: fetch config + reopen existing conversation ──────────────────

  useEffect(() => {
    // Fetch widget config from backend
    if (companyId) {
      fetchWidgetConfig(companyId).then((cfg) => {
        setConfig(cfg);
        setSoundEnabled(cfg.soundEnabled);
        setConfigLoaded(true);
      });
    } else {
      setConfigLoaded(true);
    }

    const existing = loadSession();
    if (existing) {
      setSession(existing);
      setFormName(existing.customerName);
      setFormEmail(existing.customerEmail);
      setFormPhone(existing.customerPhone);
      if (existing.conversationId) {
        setView('chat');
        checkConversationStatus(existing.conversationId);
      } else if (existing.customerName) {
        setView('home');
      }
    }
  }, []);

  async function checkConversationStatus(convId: string) {
    try {
      const res = await fetch(`${API_URL}/chat/${convId}/status`, {
        headers: { 'X-Company-Id': companyId },
      });
      if (res.ok) {
        const data = await res.json();
        setConversationStatus(data.status);
        if (data.assignedAgent) setAgentName(data.assignedAgent);
      }
    } catch { /* ignore */ }
  }

  // Auto-open tooltip (uses config delay)
  useEffect(() => {
    if (autoMessageShown || isOpen || !config.autoOpenEnabled) return;
    const delay = (config.autoOpenDelay || 5) * 1000;
    const timer = setTimeout(() => {
      if (!isOpenRef.current) setAutoMessageShown(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [autoMessageShown, isOpen, config.autoOpenEnabled, config.autoOpenDelay]);

  // ── WebSocket: connect on mount, join room when conversation exists ─────

  // Connect socket immediately on mount (not tied to session)
  useEffect(() => {
    let mounted = true;
    getSocket().then((socket) => {
      if (!mounted) return;
      socketRef.current = socket;
    });
    return () => { mounted = false; };
  }, []);

  // Join conversation room and attach listeners when session/conversationId changes
  useEffect(() => {
    if (!session) return;
    let mounted = true;

    async function setupSocket() {
      const socket = await getSocket();
      if (!mounted) return;
      socketRef.current = socket;
      if (session!.conversationId) {
        socket.emit('join:conversation', { conversationId: session!.conversationId });
      }

      socket.on('message:new', (msg: Message) => {
        if (msg.conversationId !== session!.conversationId) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Sound + unread if widget not focused on chat
        if (msg.senderType !== 'customer') {
          if (!isOpenRef.current || viewRef.current !== 'chat') {
            setUnreadCount((c) => c + 1);
          } else {
            // Widget is open and on chat view - emit seen
            if (config.featureSeenStatus) {
              socket.emit('message:seen', {
                conversationId: session!.conversationId,
                seenBy: session!.customerName,
                seenByType: 'customer',
              });
            }
          }
          if (soundEnabled && config.featureSound) playNotificationSound();
        }
      });

      socket.on('typing', (data: { conversationId: string; senderType: string; senderName?: string }) => {
        if (data.conversationId === session!.conversationId && data.senderType !== 'customer') {
          setTyping(data);
          // Auto-clear typing after 5s
          setTimeout(() => setTyping(null), 5000);
        }
      });

      socket.on('stop:typing', (data: { conversationId: string }) => {
        if (data.conversationId === session!.conversationId) setTyping(null);
      });

      socket.on('agent:joined', (data: { conversationId: string; agentName: string }) => {
        if (data.conversationId === session!.conversationId) {
          setAgentName(data.agentName);
          setMessages((prev) => [...prev, {
            id: `sys-${Date.now()}`,
            conversationId: session!.conversationId,
            senderType: 'system', senderName: 'System',
            body: `${data.agentName} joined the conversation`,
            createdAt: new Date().toISOString(),
          }]);
          if (soundEnabled && config.featureSound) playNotificationSound();
        }
      });

      socket.on('message:seen', (data: { conversationId: string; seenBy: string; seenByType: string }) => {
        if (data.conversationId === session!.conversationId && data.seenByType === 'agent') {
          setSeenByAgent(true);
          setLastSeenAgentName(data.seenBy);
        }
      });

      // Live config updates - refetch when admin saves widget settings
      socket.on('widget:config-updated', (data: { companyId: string }) => {
        if (data.companyId === companyId) {
          // Clear cache and refetch
          localStorage.removeItem(CONFIG_CACHE_KEY);
          fetchWidgetConfig(companyId).then((cfg) => setConfig(cfg));
        }
      });
    }

    setupSocket();
    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.emit('leave:conversation', { conversationId: session?.conversationId });
        socketRef.current.off('message:new');
        socketRef.current.off('typing');
        socketRef.current.off('stop:typing');
        socketRef.current.off('agent:joined');
        socketRef.current.off('message:seen');
        socketRef.current.off('widget:config-updated');
      }
    };
  }, [session?.conversationId, soundEnabled]);

  // ── Load messages ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!session?.conversationId || !companyId) return;
    loadMessages(session.conversationId);
  }, [session?.conversationId, companyId]);

  async function loadMessages(convId: string) {
    try {
      const res = await fetch(`${API_URL}/chat/${convId}/messages`, {
        headers: { 'X-Company-Id': companyId },
      });
      if (res.ok) {
        const msgs = await res.json();
        setMessages(msgs);
        if (msgs.length > 0) setQuickRepliesUsed(true);
      }
    } catch { /* ignore */ }
  }

  // ── Smart scroll ─────────────────────────────────────────────────────────

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (nearBottom) scrollToBottom();
  }, [messages, typing, scrollToBottom]);

  function handleScroll() {
    const container = messagesContainerRef.current;
    if (!container) return;
    setShowScrollDown(container.scrollHeight - container.scrollTop - container.clientHeight > 120);
  }

  useEffect(() => {
    if (isOpen && view === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 200);
      // Auto-load recent conversations for the empty state
      if (config.featureChatHistory && session?.customerEmail && messages.length === 0) {
        loadHistory();
      }
    }
  }, [isOpen, view]);

  // ── Pre-chat ─────────────────────────────────────────────────────────────

  function handlePreChatSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;
    const s: Session = {
      conversationId: '',
      customerName: formName.trim(),
      customerEmail: formEmail.trim(),
      customerPhone: formPhone.trim(),
    };
    setSession(s);
    saveSession(s);
    setView('chat');
  }

  // ── Send message ─────────────────────────────────────────────────────────

  async function emitTypingPreview(text: string) {
    if (!session || !config.featureLiveTyping) return;
    // Get socket directly - don't rely on ref which may not be set yet
    const socket = socketRef.current ?? await getSocket();
    if (!socket) return;
    socketRef.current = socket;

    const convId = session.conversationId || 'pending';

    // Clear any pending stop timer
    if (stopPreviewTimer.current) clearTimeout(stopPreviewTimer.current);

    if (text.trim()) {
      // Emit immediately on every keystroke for real-time feel
      socket.emit('typing:preview', {
        conversationId: convId,
        companyId,
        senderType: 'customer',
        senderName: session.customerName,
        draft: text,
      });

      // Auto-stop after 5s of inactivity
      stopPreviewTimer.current = setTimeout(() => {
        socket.emit('typing:preview', {
          conversationId: convId,
          companyId,
          senderType: 'customer',
          senderName: session?.customerName,
          draft: '',
        });
        socket.emit('stop:typing', {
          conversationId: convId,
          companyId,
          senderType: 'customer',
          senderName: session?.customerName,
        });
      }, 5000);
    } else {
      // Empty input - immediately signal stop
      socket.emit('stop:typing', {
        conversationId: convId,
        companyId,
        senderType: 'customer',
        senderName: session.customerName,
      });
    }
  }

  async function handleSend(textOverride?: string) {
    const text = (textOverride ?? draft).trim();
    if (!text || sending || !session) return;
    if (!textOverride) setDraft('');
    setSending(true);
    setQuickRepliesUsed(true);
    setSeenByAgent(false);
    // Clear typing preview on send
    if (socketRef.current) {
      if (stopPreviewTimer.current) clearTimeout(stopPreviewTimer.current);
      socketRef.current.emit('stop:typing', {
        conversationId: session.conversationId || 'pending',
        companyId,
        senderType: 'customer',
        senderName: session.customerName,
      });
    }

    const optimisticId = `opt-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: optimisticId,
      conversationId: session.conversationId || 'pending',
      senderType: 'customer', senderName: session.customerName,
      body: text, createdAt: new Date().toISOString(),
    }]);

    try {
      const payload: Record<string, unknown> = {
        message: text,
        customerName: session.customerName,
        customerEmail: session.customerEmail || undefined,
        customerPhone: session.customerPhone || undefined,
        visitorData: getVisitorData(),
      };
      if (session.conversationId) payload.conversationId = session.conversationId;

      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Company-Id': companyId },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();

      // Save conversation ID on first message
      if (!session.conversationId) {
        const updated = { ...session, conversationId: data.conversationId };
        setSession(updated);
        saveSession(updated);
        setConversationStatus('open');
      }

      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== optimisticId);
        const result = [...without];
        if (!result.some((m) => m.body === text && m.senderType === 'customer')) {
          result.push({ id: `msg-${Date.now()}`, conversationId: data.conversationId, senderType: 'customer', senderName: session.customerName, body: text, createdAt: new Date().toISOString() });
        }
        if (data.reply && !result.some((m) => m.body === data.reply && m.senderType === 'ai')) {
          result.push({ id: `ai-${Date.now()}`, conversationId: data.conversationId, senderType: 'ai', senderName: 'AI Assistant', body: data.reply, createdAt: new Date().toISOString() });
        }
        return result;
      });

      if (data.escalated) {
        setMessages((prev) => [...prev, {
          id: `sys-esc-${Date.now()}`, conversationId: data.conversationId, senderType: 'system', senderName: 'System',
          body: 'Connecting you with a human agent...', createdAt: new Date().toISOString(),
        }]);
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setDraft(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  // ── File handling ────────────────────────────────────────────────────────

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setPendingFilePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPendingFilePreview(null);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }

  function clearPendingFile() {
    setPendingFile(null);
    setPendingFilePreview(null);
  }

  async function handleSendFile() {
    if (!pendingFile || !session?.conversationId || !companyId) return;
    setUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append('file', pendingFile);
      formData.append('customerName', session.customerName);
      if (draft.trim()) formData.append('message', draft.trim());

      const res = await fetch(`${API_URL}/chat/${session.conversationId}/upload`, {
        method: 'POST',
        headers: { 'X-Company-Id': companyId },
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const msg = await res.json();

      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      clearPendingFile();
      setDraft('');
    } catch {
      // Keep file for retry
    } finally {
      setUploadingFile(false);
    }
  }

  function insertEmoji(emoji: string) {
    setDraft((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  async function handleCloseConversation() {
    if (!session?.conversationId || !companyId) return;
    try {
      await fetch(`${API_URL}/chat/${session.conversationId}/close`, {
        method: 'PATCH', headers: { 'X-Company-Id': companyId },
      });
      setConversationStatus('resolved');
      setMessages((prev) => [...prev, {
        id: `sys-close-${Date.now()}`, conversationId: session.conversationId,
        senderType: 'system', senderName: 'System',
        body: 'Conversation ended. Thank you for chatting with us!',
        createdAt: new Date().toISOString(),
      }]);
      setView('rating');
    } catch { /* ignore */ }
  }

  async function handleSubmitRating() {
    if (!session?.conversationId || !companyId || rating === 0) return;
    try {
      await fetch(`${API_URL}/chat/${session.conversationId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Company-Id': companyId },
        body: JSON.stringify({ rating, comment: ratingComment }),
      });
      setRatingSubmitted(true);
    } catch { /* ignore */ }
  }

  function handleStartFreshConversation() {
    // Only allowed after a resolved conversation
    const fresh: Session = {
      conversationId: '',
      customerName: session?.customerName ?? '',
      customerEmail: session?.customerEmail ?? '',
      customerPhone: session?.customerPhone ?? '',
    };
    setSession(fresh);
    saveSession(fresh);
    setMessages([]);
    setAgentName(null);
    setConversationStatus('open');
    setRating(0);
    setRatingComment('');
    setRatingSubmitted(false);
    setQuickRepliesUsed(false);
    setView('chat');
  }

  async function loadHistory() {
    if (!session?.customerEmail || !companyId) return;
    try {
      const res = await fetch(`${API_URL}/chat/history/${encodeURIComponent(session.customerEmail)}`, {
        headers: { 'X-Company-Id': companyId },
      });
      if (res.ok) setPastConvs(await res.json());
    } catch { /* ignore */ }
  }

  function openPastConversation(conv: PastConversation) {
    const updated: Session = { ...session!, conversationId: conv.id };
    setSession(updated);
    saveSession(updated);
    setConversationStatus(conv.status);
    setQuickRepliesUsed(true);
    setView('chat');
  }

  function openWidget() {
    setIsOpen(true);
    setUnreadCount(0);
    setAutoMessageShown(false);
    if (!session || !session.customerName) {
      setView('prechat');
    } else if (session.conversationId && messages.length > 0) {
      // Active conversation with messages -> go to chat
      setView('chat');
    } else {
      // Known user but no active chat -> show home
      setView('home');
      if (config.featureChatHistory && session.customerEmail) loadHistory();
    }
  }

  // ── RENDER ───────────────────────────────────────────────────────────────

  // AI suggestion buttons - shown after the last AI message
  const AI_FOLLOW_UPS = [
    { label: 'Tell me more', msg: 'Tell me more about that.' },
    { label: 'Yes, that helps', msg: 'Yes, that helps. Thank you!' },
    { label: 'Talk to human', msg: 'I would like to speak with a human agent.' },
  ];

  const lastMsg = messages[messages.length - 1];
  const showAiFollowUps = lastMsg?.senderType === 'ai' && conversationStatus === 'open' && !sending && messages.length >= 2;

  return (
    <>
      {/* ── Floating Launcher (hidden in embedded/iframe mode) ── */}
      {!isOpen && !IS_EMBEDDED && (
        <div className={`fixed bottom-5 z-[9999] flex flex-col gap-3 ${config.widgetPosition === 'left' ? 'left-5 items-start' : 'right-5 items-end'}`}>
          {autoMessageShown && unreadCount === 0 && !session?.conversationId && (
            <div onClick={openWidget} className="max-w-[260px] cursor-pointer rounded-2xl bg-white p-3.5 shadow-xl ring-1 ring-black/[0.05]" style={{ animation: 'cbFadeUp 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
              <p className="text-[13px] font-medium text-gray-900">Need help?</p>
              <p className="mt-0.5 text-[11px] text-gray-500">We usually reply in minutes.</p>
            </div>
          )}
          <button onClick={openWidget} className="group relative flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg shadow-black/15 transition-all duration-300 hover:scale-[1.06] hover:shadow-xl active:scale-95" style={{ background: theme.bubbleBg, color: theme.headerText }} aria-label="Open chat">
            <MessageSquare className="h-[22px] w-[22px] transition-transform group-hover:scale-110" />
            {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
        </div>
      )}


      {/* ── Widget ── */}
      {isOpen && (
        <div
          className={IS_EMBEDDED ? 'flex flex-col overflow-hidden bg-white' : 'fixed bottom-5 z-[9999] flex w-[380px] flex-col overflow-hidden bg-white'}
          style={{
            height: IS_EMBEDDED ? '100vh' : '600px',
            width: IS_EMBEDDED ? '100vw' : '380px',
            animation: IS_EMBEDDED ? 'none' : 'cbOpen 0.35s cubic-bezier(0.16,1,0.3,1)',
            borderRadius: IS_EMBEDDED ? '0' : '16px',
            boxShadow: IS_EMBEDDED ? 'none' : '0 25px 50px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.03)',
            ...(IS_EMBEDDED ? {} : { [config.widgetPosition === 'left' ? 'left' : 'right']: '20px' }),
            '--cb-user-bg': theme.userBubbleBg,
            '--cb-user-text': theme.userBubbleText,
            '--cb-bot-bg': theme.botBubbleBg,
            '--cb-bot-text': theme.botBubbleText,
            '--cb-accent': theme.accentSoft,
          } as React.CSSProperties}
        >
          {/* ── Header ── */}
          <div className="relative flex items-center justify-between px-4 py-2.5" style={{ background: `linear-gradient(135deg, ${theme.headerBg}, ${theme.accentHover})` }}>
            <div className="flex items-center gap-2.5 min-w-0">
              {(view === 'history' || view === 'rating' || (view === 'chat' && session?.customerName)) && (
                <button onClick={() => view === 'chat' ? (() => { if (session?.customerEmail) loadHistory(); setView('home'); })() : (session?.conversationId ? setView('chat') : setView('home'))} className="rounded-lg p-1 transition-all hover:bg-white/10 active:scale-90" style={{ color: theme.headerSubtext }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              {/* Stacked avatars */}
              <div className="relative flex items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-[11px] font-bold" style={{ color: theme.headerText }}>
                  {config.botAvatarUrl ? <img src={config.botAvatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" /> : <Bot className="h-4 w-4" />}
                </div>
                {agentName && (
                  <div className="absolute -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/30 backdrop-blur-sm ring-2 text-[9px] font-bold" style={{ color: theme.headerText, animation: 'cbFadeUp 0.3s ease-out', boxShadow: `0 0 0 2px ${theme.headerBg}` }}>
                    {agentName[0]}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold truncate" style={{ color: theme.headerText }}>
                  {agentName ? agentName : config.companyName}
                </p>
                <div className="flex items-center gap-1">
                  <span className="relative flex h-[5px] w-[5px]"><span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-50" /><span className="relative h-[5px] w-[5px] rounded-full bg-emerald-400" /></span>
                  <span className="text-[10px]" style={{ color: theme.headerSubtext }}>
                    {typing ? `${typing.senderName ?? 'Agent'} is typing...` : agentName ? 'Active now' : 'Online'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button onClick={() => setSoundEnabled(!soundEnabled)} className="rounded-lg p-1.5 transition-all hover:bg-white/10 active:scale-90" style={{ color: soundEnabled ? theme.headerSubtext : `${theme.headerSubtext}33` }}><Volume2 className="h-3.5 w-3.5" /></button>
              <button onClick={() => { if (IS_EMBEDDED && window.parent !== window) { window.parent.postMessage({ type: 'chatbox:close' }, '*'); } else { setIsOpen(false); } }} className="rounded-lg p-1.5 transition-all hover:bg-white/10 active:scale-90" style={{ color: theme.headerSubtext }}><X className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="flex flex-1 flex-col overflow-hidden bg-[#fafbfc]">

            {/* HOME */}
            {view === 'home' && (
              <div className="flex-1 overflow-y-auto">
                {/* Welcome */}
                <div className="px-5 pt-5 pb-4">
                  <p className="text-[15px] font-bold text-gray-900">{session?.customerName ? `Hi ${session.customerName}` : 'Hi there'} 👋</p>
                  <p className="mt-0.5 text-[12px] text-gray-500 leading-relaxed">{config.welcomeMessage}</p>
                </div>

                {/* Continue conversation */}
                {config.featureChatHistory && pastConvs.length > 0 && pastConvs[0].status === 'open' && (
                  <div className="mx-5 mb-3">
                    <button onClick={() => openPastConversation(pastConvs[0])} className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left ring-1 ring-black/[0.04] transition-all hover:shadow-md active:scale-[0.99]" style={{ animation: 'cbFadeUp 0.3s ease-out' }}>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: theme.accentSoft }}><MessageSquare className="h-4 w-4" style={{ color: theme.userBubbleBg }} /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] text-gray-700">{pastConvs[0].lastMessage ?? 'Continue your conversation'}</p>
                        <p className="text-[10px] text-gray-400">{formatDate(pastConvs[0].updatedAt)}</p>
                      </div>
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                    </button>
                  </div>
                )}

                {/* New conversation CTA */}
                <div className="mx-5 mb-4">
                  <button onClick={() => { handleStartFreshConversation(); setView('chat'); }} className="w-full rounded-xl p-3.5 text-left transition-all hover:opacity-90 active:scale-[0.98]" style={{ background: theme.userBubbleBg }}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20"><Send className="h-4 w-4" style={{ color: theme.userBubbleText }} /></div>
                      <div>
                        <p className="text-[13px] font-semibold" style={{ color: theme.userBubbleText }}>Send us a message</p>
                        <p className="text-[10px] opacity-60" style={{ color: theme.userBubbleText }}>We reply in minutes</p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Quick pills */}
                <div className="mx-5 mb-4 flex flex-wrap gap-1.5">
                  {QUICK_REPLIES.map((qr) => (
                    <button key={qr.label} onClick={() => { setView('chat'); setTimeout(() => handleSend(qr.message), 100); }} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-gray-600 ring-1 ring-black/[0.04] transition-all hover:shadow-sm hover:ring-black/[0.08] active:scale-95">
                      <qr.icon className="h-3 w-3 text-gray-400" />{qr.label}
                    </button>
                  ))}
                </div>

                {/* History list */}
                {config.featureChatHistory && pastConvs.length > 1 && (
                  <div className="mx-5 mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Previous</p>
                      {pastConvs.length > 3 && <button onClick={() => setView('history')} className="text-[10px] font-medium" style={{ color: theme.userBubbleBg }}>View all</button>}
                    </div>
                    <div className="rounded-xl bg-white ring-1 ring-black/[0.04] overflow-hidden divide-y divide-gray-50">
                      {pastConvs.slice(1, 4).map((c) => (
                        <button key={c.id} onClick={() => openPastConversation(c)} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 active:bg-gray-100/60">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] text-gray-700">{c.lastMessage ?? '...'}</p>
                            <p className="text-[9px] text-gray-400">{formatDate(c.updatedAt)} &middot; {c.messageCount} msgs</p>
                          </div>
                          {c.status === 'open' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PRECHAT */}
            {view === 'prechat' && (
              <div className="flex-1 overflow-y-auto px-5 pt-6 pb-5">
                <div className="text-center mb-5">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: theme.accentSoft }}>
                    <MessageSquare className="h-5 w-5" style={{ color: theme.userBubbleBg }} />
                  </div>
                  <p className="text-[15px] font-bold text-gray-900">Start a conversation</p>
                  <p className="mt-0.5 text-[12px] text-gray-500">We&apos;ll get back to you right away</p>
                </div>
                <form onSubmit={handlePreChatSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">Name <span className="text-red-400">*</span></label>
                    <input type="text" required value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Your name" className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13px] text-gray-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-50" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">Email</label>
                    <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="you@company.com" className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13px] text-gray-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-50" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">Phone <span className="text-gray-300 font-normal">(optional)</span></label>
                    <input type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+1 555 000 0000" className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13px] text-gray-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-50" />
                  </div>
                  <button type="submit" className="w-full rounded-xl py-3 text-[13px] font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-[0.98]" style={{ background: theme.userBubbleBg }}>Continue</button>
                </form>
              </div>
            )}

            {/* CHAT */}
            {view === 'chat' && (
              <>
                <div ref={messagesContainerRef} onScroll={handleScroll} className="relative flex-1 overflow-y-auto px-4 py-4" style={{ background: theme.chatBg }}>
                  {/* Empty state */}
                  {messages.length === 0 && !sending && (
                    <div className="flex flex-col items-center justify-center h-full opacity-60">
                      <p className="text-[12px] text-gray-400">Type a message to start</p>
                      <div className="mt-2 flex gap-1.5">
                        {QUICK_REPLIES.map((qr) => (
                          <button key={qr.label} onClick={() => handleSend(qr.message)} className="rounded-full bg-white px-2.5 py-1 text-[10px] text-gray-500 ring-1 ring-gray-200/80 transition hover:ring-gray-300 active:scale-95">{qr.label}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  <div className="space-y-1">
                    {messages.map((msg, idx) => {
                      const prev = messages[idx - 1];
                      const showDate = !prev || new Date(msg.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
                      const grouped = prev && prev.senderType === msg.senderType && !showDate;
                      const isSystem = msg.senderType === 'system';
                      const isCustomer = msg.senderType === 'customer';
                      const isLast = idx === messages.length - 1;

                      return (
                        <div key={msg.id} style={{ animation: 'cbMsgIn 0.25s ease-out' }}>
                          {showDate && (
                            <div className="my-4 flex items-center gap-3"><div className="h-px flex-1 bg-gray-200/50" /><span className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">{new Date(msg.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span><div className="h-px flex-1 bg-gray-200/50" /></div>
                          )}
                          {isSystem ? (
                            <div className="my-2 text-center"><span className="text-[10px] text-gray-400">{msg.body}</span></div>
                          ) : (
                            <div className={`flex items-end gap-2 ${isCustomer ? 'flex-row-reverse' : ''} ${grouped ? 'mt-0.5' : 'mt-3'}`}>
                              {!isCustomer && <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${grouped ? 'opacity-0' : ''}`} style={{ background: theme.accentSoft, color: theme.userBubbleBg }}>{msg.senderType === 'agent' ? (msg.senderName?.[0] ?? 'A') : <Bot className="h-3 w-3" />}</div>}
                              <div className="max-w-[75%]">
                                {!isCustomer && !grouped && <p className="mb-0.5 pl-0.5 text-[9px] font-medium text-gray-400">{msg.senderType === 'agent' ? msg.senderName : 'AI'}</p>}
                                <div className={`rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${isCustomer ? 'rounded-br-md' : 'rounded-bl-md'}`} style={isCustomer ? { background: 'var(--cb-user-bg)', color: 'var(--cb-user-text)' } : { background: 'var(--cb-bot-bg)', color: 'var(--cb-bot-text)', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                                  {msg.body && <span>{msg.body}</span>}
                                  {msg.attachmentUrl && msg.attachmentName && <AttachmentDisplay url={msg.attachmentUrl} name={msg.attachmentName} isCustomer={isCustomer} />}
                                </div>
                                {/* Seen/sent for last customer msg */}
                                {config.featureSeenStatus && isCustomer && isLast && (
                                  <p className="mt-0.5 text-right pr-0.5 text-[9px] text-gray-400">
                                    {seenByAgent ? <><CheckCheck className="inline h-2.5 w-2.5 text-blue-500" /> Seen</> : <><CheckCheck className="inline h-2.5 w-2.5 text-gray-300" /> Sent</>}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* AI follow-up chips */}
                  {showAiFollowUps && (
                    <div className="mt-2 flex flex-wrap gap-1 pl-8" style={{ animation: 'cbFadeUp 0.3s ease-out' }}>
                      {AI_FOLLOW_UPS.map((f) => (
                        <button key={f.label} onClick={() => handleSend(f.msg)} className="rounded-full px-2.5 py-1 text-[10px] font-medium transition-all hover:shadow-sm active:scale-95" style={{ background: theme.accentSoft, color: theme.userBubbleBg }}>{f.label}</button>
                      ))}
                    </div>
                  )}

                  {/* Typing */}
                  {(typing || sending) && (
                    <div className="mt-3 flex items-end gap-2" style={{ animation: 'cbMsgIn 0.2s ease-out' }}>
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: theme.accentSoft }}><Bot className="h-3 w-3" style={{ color: theme.userBubbleBg }} /></div>
                      <div className="rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-[3px]">{[0, 150, 300].map((d) => <span key={d} className="h-[5px] w-[5px] animate-bounce rounded-full" style={{ background: theme.userBubbleBg, opacity: 0.5, animationDelay: `${d}ms` }} />)}</div>
                          <span className="text-[10px] text-gray-400">{typing?.senderType === 'agent' ? `${typing.senderName ?? 'Agent'} is typing` : 'Thinking'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} className="h-2" />
                  {showScrollDown && <button onClick={scrollToBottom} className="sticky bottom-1 left-1/2 mx-auto flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/5 transition hover:shadow-lg" style={{ animation: 'cbFadeUp 0.15s ease-out' }}><ArrowDown className="h-3.5 w-3.5 text-gray-500" /></button>}
                </div>

                {/* Input */}
                {conversationStatus !== 'resolved' ? (
                  <div className="bg-white px-3 pb-2 pt-1.5">
                    {config.featureEndChat && session?.conversationId && <div className="flex justify-end mb-1"><button onClick={handleCloseConversation} className="text-[9px] text-gray-400 transition hover:text-gray-500">End conversation</button></div>}
                    {config.featureFileUpload && pendingFile && (
                      <div className="mb-1.5 flex items-center gap-2 rounded-lg bg-gray-50 p-2 ring-1 ring-gray-100" style={{ animation: 'cbFadeUp 0.15s ease-out' }}>
                        {pendingFilePreview ? <img src={pendingFilePreview} alt="" className="h-10 w-10 rounded-md object-cover" /> : <FileText className="h-5 w-5 text-gray-400" />}
                        <div className="min-w-0 flex-1"><p className="truncate text-[11px] text-gray-700">{pendingFile.name}</p><p className="text-[9px] text-gray-400">{(pendingFile.size / 1024).toFixed(0)} KB</p></div>
                        <button onClick={clearPendingFile} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                      </div>
                    )}
                    {config.featureEmoji && showEmojiPicker && <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmojiPicker(false)} />}
                    <div className="flex items-center gap-1 rounded-2xl bg-gray-50 px-1.5 ring-1 ring-gray-200/50 transition-all focus-within:bg-white focus-within:shadow-md focus-within:ring-gray-300/60">
                      {config.featureEmoji && <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`rounded-lg p-1.5 transition ${showEmojiPicker ? 'text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}><Smile className="h-[17px] w-[17px]" /></button>}
                      {config.featureFileUpload && <><button onClick={() => fileInputRef.current?.click()} className="rounded-lg p-1.5 text-gray-400 transition hover:text-gray-600"><Paperclip className="h-[17px] w-[17px]" /></button><input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip" onChange={handleFileSelect} /></>}
                      <input ref={inputRef} type="text" value={draft} onChange={(e) => { setDraft(e.target.value); emitTypingPreview(e.target.value); }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); pendingFile ? handleSendFile() : handleSend(); } }} placeholder="Write a message..." className="flex-1 bg-transparent py-2.5 text-[13px] text-gray-900 placeholder-gray-400 outline-none" disabled={sending || uploadingFile} />
                      <button onClick={() => pendingFile ? handleSendFile() : handleSend()} disabled={(!draft.trim() && !pendingFile) || sending || uploadingFile} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition-all disabled:opacity-20 active:scale-90" style={{ background: theme.sendBg, color: theme.sendText }}>{(sending || uploadingFile) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}</button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white px-4 py-4 text-center">
                    <p className="text-[11px] text-gray-500">Conversation ended</p>
                    <button onClick={handleStartFreshConversation} className="mt-2 rounded-full px-4 py-2 text-[11px] font-semibold text-white transition-all hover:shadow-md active:scale-95" style={{ background: theme.sendBg }}>New conversation</button>
                  </div>
                )}
              </>
            )}

            {/* HISTORY */}
            {view === 'history' && (
              <div className="flex-1 overflow-y-auto">
                <div className="px-4 pt-3 pb-2"><p className="text-[12px] font-semibold text-gray-500">All conversations</p></div>
                <div className="px-3 pb-3 space-y-1">
                  {pastConvs.length === 0 ? (
                    <div className="py-16 text-center"><Clock className="mx-auto h-6 w-6 text-gray-300" /><p className="mt-2 text-[12px] text-gray-400">No conversations yet</p></div>
                  ) : pastConvs.map((c) => (
                    <button key={c.id} onClick={() => openPastConversation(c)} className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all ${c.id === session?.conversationId ? 'bg-blue-50/80 ring-1 ring-blue-200/50' : 'hover:bg-gray-50'}`}>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: theme.accentSoft }}><MessageSquare className="h-3.5 w-3.5" style={{ color: theme.userBubbleBg }} /></div>
                      <div className="min-w-0 flex-1"><p className="truncate text-[11px] text-gray-700">{c.lastMessage ?? '...'}</p><p className="text-[9px] text-gray-400">{formatDate(c.updatedAt)} &middot; {c.messageCount} msgs</p></div>
                      {c.status === 'open' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* RATING */}
            {view === 'rating' && (
              <div className="flex flex-1 flex-col items-center justify-center px-6">
                {ratingSubmitted ? (
                  <>
                    <CheckCheck className="h-10 w-10 text-emerald-500" />
                    <p className="mt-3 text-[14px] font-bold text-gray-900">Thank you!</p>
                    <p className="mt-1 text-[12px] text-gray-500">Your feedback helps us improve.</p>
                    <div className="mt-5 flex gap-2">
                      <button onClick={handleStartFreshConversation} className="rounded-xl px-4 py-2 text-[12px] font-semibold text-white transition hover:shadow-md active:scale-95" style={{ background: theme.sendBg }}>New chat</button>
                      <button onClick={() => setIsOpen(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-[12px] font-medium text-gray-600 transition hover:bg-gray-50 active:scale-95">Close</button>
                    </div>
                  </>
                ) : (
                  <>
                    <Star className="h-8 w-8 text-amber-400" />
                    <p className="mt-3 text-[14px] font-bold text-gray-900">Rate your experience</p>
                    <div className="mt-4 flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button key={s} onClick={() => setRating(s)} className="p-0.5 transition hover:scale-110 active:scale-95">
                          <Star className={`h-7 w-7 transition ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                        </button>
                      ))}
                    </div>
                    {rating > 0 && (
                      <div className="mt-3 w-full" style={{ animation: 'cbFadeUp 0.2s ease-out' }}>
                        <textarea value={ratingComment} onChange={(e) => setRatingComment(e.target.value)} placeholder="Any feedback? (optional)" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-blue-300 focus:ring-1 focus:ring-blue-50 resize-none" rows={2} />
                        <button onClick={handleSubmitRating} className="mt-2 w-full rounded-xl py-2.5 text-[12px] font-semibold text-white transition active:scale-[0.98]" style={{ background: theme.sendBg }}>Submit</button>
                      </div>
                    )}
                    <button onClick={handleStartFreshConversation} className="mt-3 text-[10px] text-gray-400 transition hover:text-gray-600">Skip</button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-1"><p className="text-center text-[9px] text-gray-300">Powered by <span className="font-semibold text-gray-400">{config.companyName}</span></p></div>
        </div>
      )}

      {/* Animations */}
      <style jsx global>{`
        @keyframes cbOpen { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes cbFadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cbMsgIn { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }
        ${config.customCSS}
      `}</style>
    </>
  );
}

// ── Emoji Picker ───────────────────────────────────────────────────────────

const EMOJI_GRID = ['😊', '😂', '🥰', '😍', '🤔', '😅', '😢', '🥳', '😎', '🤗', '👍', '👎', '👋', '🙏', '💪', '❤️', '🔥', '⭐', '✅', '💯', '🎉', '👏', '🤝', '💡', '📎', '📄', '💻', '📱', '⏰', '🔑', '📧', '🚀'];

function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);
  return (
    <div ref={ref} className="mb-1 rounded-xl bg-white p-2 shadow-lg ring-1 ring-black/5" style={{ animation: 'cbFadeUp 0.15s ease-out' }}>
      <div className="grid grid-cols-8 gap-0.5">{EMOJI_GRID.map((e) => <button key={e} onClick={() => onSelect(e)} className="flex h-8 w-8 items-center justify-center rounded-lg text-base transition hover:bg-gray-100 hover:scale-110 active:scale-95">{e}</button>)}</div>
    </div>
  );
}

// ── Attachment ──────────────────────────────────────────────────────────────

const API_BASE = API_URL.replace('/api/v1', '');

function AttachmentDisplay({ url, name, isCustomer }: { url: string; name: string; isCustomer: boolean }) {
  const full = url.startsWith('http') ? url : `${API_BASE}${url}`;
  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
    return <a href={full} target="_blank" rel="noopener noreferrer" className="mt-1 block"><img src={full} alt={name} className="max-h-36 rounded-lg object-cover" loading="lazy" /></a>;
  }
  return (
    <a href={full} target="_blank" rel="noopener noreferrer" className={`mt-1 flex items-center gap-2 rounded-lg p-2 transition ${isCustomer ? 'bg-white/15 hover:bg-white/25' : 'bg-gray-50 hover:bg-gray-100'}`}>
      <FileText className={`h-4 w-4 ${isCustomer ? 'text-white/70' : 'text-gray-400'}`} />
      <span className={`truncate text-[11px] ${isCustomer ? 'text-white' : 'text-gray-700'}`}>{name}</span>
      <Download className={`h-3 w-3 shrink-0 ${isCustomer ? 'text-white/50' : 'text-gray-400'}`} />
    </a>
  );
}
