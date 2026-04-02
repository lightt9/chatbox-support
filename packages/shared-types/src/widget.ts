export type WidgetPosition = 'left' | 'right';
export type WidgetSize = 'small' | 'medium' | 'large';

export interface WidgetConfig {
  companyName: string;
  welcomeMessage: string;
  botAvatarUrl: string;
  headerColor: string;
  userMessageColor: string;
  botMessageColor: string;
  chatBackground: string;
  widgetPosition: WidgetPosition;
  widgetSize: WidgetSize;
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
  preChatCustomFields: PreChatField[];
  customCSS: string;
}

export interface PreChatField {
  label: string;
  type: string;
  required: boolean;
}

export interface AppearanceConfig {
  theme: 'light' | 'dark' | 'system';
  primaryColor: string;
}
