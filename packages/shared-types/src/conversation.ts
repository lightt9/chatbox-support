import type { ChannelType } from './company.js';

export type ConversationStatus = 'active' | 'escalated' | 'resolved' | 'closed';
export type SenderType = 'customer' | 'bot' | 'operator';
export type ContentType = 'text' | 'image' | 'audio' | 'file' | 'location';

export interface Conversation {
  id: string;
  companyId: string;
  customerId: string;
  channelType: ChannelType;
  status: ConversationStatus;
  assignedOperatorId: string | null;
  escalationReason: string | null;
  summary: string | null;
  sentimentScore: number | null;
  metadata: Record<string, unknown>;
  startedAt: Date;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  companyId: string;
  senderType: SenderType;
  senderId: string | null;
  contentType: ContentType;
  content: string;
  originalContent: string | null;
  mediaUrl: string | null;
  metadata: Record<string, unknown>;
  intent: string | null;
  confidence: number | null;
  createdAt: Date;
}
