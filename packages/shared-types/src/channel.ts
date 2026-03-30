import type { ChannelType } from './company.js';
import type { ContentType } from './conversation.js';

export interface NormalizedInboundMessage {
  channelType: ChannelType;
  channelMessageId: string;
  senderIdentifier: string;
  contentType: ContentType;
  content: string;
  mediaUrl?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface OutboundMessage {
  channelType: ChannelType;
  recipientIdentifier: string;
  contentType: ContentType;
  content: string;
  mediaUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface WebhookPayload {
  channelType: ChannelType;
  companyId: string;
  rawPayload: unknown;
  signature?: string;
}
