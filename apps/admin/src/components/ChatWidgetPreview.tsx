'use client';

import { useState } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';

export interface WidgetConfig {
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
  customCSS: string;
  // Feature toggles
  featureLiveTyping: boolean;
  featureSeenStatus: boolean;
  featureFileUpload: boolean;
  featureEmoji: boolean;
  featureSound: boolean;
  featureChatHistory: boolean;
  featureEndChat: boolean;
  featureAiSuggestions: boolean;
}

const SIZES: Record<string, { w: number; h: number; bubble: number }> = {
  small:  { w: 320, h: 420, bubble: 48 },
  medium: { w: 370, h: 500, bubble: 56 },
  large:  { w: 420, h: 560, bubble: 64 },
};

function contrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#1a1a2e' : '#ffffff';
}

const DEMO_MESSAGES = [
  { from: 'bot', text: '' },
  { from: 'user', text: 'I need help with my subscription' },
  { from: 'bot', text: "Sure! I'd be happy to help with your subscription. Could you tell me your account email?" },
];

export function ChatWidgetPreview({ config }: { config: WidgetConfig }) {
  const [open, setOpen] = useState(true);
  const sz = SIZES[config.widgetSize] ?? SIZES.medium;
  const isRight = config.widgetPosition === 'right';
  const headerText = contrastText(config.headerColor);
  const userText = contrastText(config.userMessageColor);
  const botTextColor = contrastText(config.botMessageColor);
  const radius = config.borderRadius;

  const messages = DEMO_MESSAGES.map((m) =>
    m.from === 'bot' && m.text === '' ? { ...m, text: config.welcomeMessage } : m,
  );

  return (
    <div className="relative" style={{ height: sz.h + 80, width: sz.w + 16 }}>
      {/* ── Chat Window ──────────────────────────────────────────────── */}
      {open && (
        <div
          className="absolute top-0 flex flex-col overflow-hidden transition-all duration-300"
          style={{
            width: sz.w,
            height: sz.h,
            borderRadius: radius,
            [isRight ? 'right' : 'left']: 8,
            background: config.chatBackground,
            boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25), 0 0 0 1px rgb(0 0 0 / 0.05)',
          }}
        >
          {/* Header — with subtle gradient overlay */}
          <div
            className="flex items-center justify-between px-5 py-4 shrink-0"
            style={{
              background: `linear-gradient(135deg, ${config.headerColor}, ${config.headerColor}ee)`,
              borderRadius: `${radius}px ${radius}px 0 0`,
            }}
          >
            <div className="flex items-center gap-3">
              {config.botAvatarUrl ? (
                <img
                  src={config.botAvatarUrl}
                  alt="Bot"
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-white/20"
                />
              ) : (
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
                  style={{ background: 'rgba(255,255,255,0.15)', color: headerText }}
                >
                  {config.companyName.charAt(0)}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold" style={{ color: headerText }}>
                  {config.companyName}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  <p className="text-[11px]" style={{ color: headerText, opacity: 0.7 }}>
                    Online
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="cursor-pointer rounded-full p-1.5 transition-colors hover:bg-white/10"
            >
              <X className="h-4 w-4" style={{ color: headerText }} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
            {messages.map((m, i) => {
              const isUser = m.from === 'user';
              return (
                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  style={{ animation: `slideUp 0.3s ease-out ${i * 0.1}s both` }}>
                  <div
                    className="max-w-[80%] px-3.5 py-2.5 text-[13px] leading-relaxed"
                    style={{
                      background: isUser ? config.userMessageColor : config.botMessageColor,
                      color: isUser ? userText : botTextColor,
                      borderRadius: isUser
                        ? `${radius * 0.75}px ${radius * 0.75}px 4px ${radius * 0.75}px`
                        : `${radius * 0.75}px ${radius * 0.75}px ${radius * 0.75}px 4px`,
                      boxShadow: '0 1px 2px rgb(0 0 0 / 0.06)',
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div
            className="flex items-center gap-2 px-4 py-3 shrink-0"
            style={{
              background: config.chatBackground,
              borderTop: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <input
              type="text"
              placeholder="Type a message..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
              readOnly
            />
            <button
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95"
              style={{
                background: config.headerColor,
                boxShadow: `0 2px 8px ${config.headerColor}40`,
              }}
            >
              <Send className="h-3.5 w-3.5" style={{ color: headerText }} />
            </button>
          </div>
        </div>
      )}

      {/* ── Bubble Button ────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(!open)}
        className="absolute bottom-0 flex cursor-pointer items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        style={{
          width: sz.bubble,
          height: sz.bubble,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${config.headerColor}, ${config.headerColor}dd)`,
          [isRight ? 'right' : 'left']: 8,
          boxShadow: `0 4px 14px ${config.headerColor}40`,
        }}
      >
        {open ? (
          <X className="h-6 w-6" style={{ color: headerText }} />
        ) : (
          <MessageCircle className="h-6 w-6" style={{ color: headerText }} />
        )}
        {!open && config.notificationBadge && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
            1
          </span>
        )}
        {!open && config.pulseAnimation && (
          <span
            className="absolute inset-0 animate-ping rounded-full opacity-20"
            style={{ background: config.headerColor }}
          />
        )}
      </button>
    </div>
  );
}
