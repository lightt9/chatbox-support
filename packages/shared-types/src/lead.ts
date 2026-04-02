export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
export type LeadRating = 'hot' | 'warm' | 'cold';
export type LeadSource = 'chat_widget' | 'website' | 'referral' | 'social' | 'ads' | 'manual' | 'api';

export interface Lead {
  id: string;
  displayId: string;
  companyId?: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  title: string | null;
  source: LeadSource;
  status: LeadStatus;
  rating: LeadRating;
  assignedTo: string | null;
  notes: string | null;
  tags: string[];
  lostReason: string | null;
  convertedAt: string | null;
  lastContacted: string | null;
  conversationId: string | null;
  firstMessage: string | null;
  lastMessage: string | null;
  messageCount: number;
  customFields: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface LeadsResponse {
  leads: Lead[];
  counts: Record<LeadStatus, number>;
  total: number;
}

export interface CreateChatLeadInput {
  conversationId: string;
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
  firstMessage: string;
  customFields?: Record<string, string>;
}

export interface SyncMessageInput {
  conversationId: string;
  message: string;
  senderType: 'customer' | 'ai' | 'operator' | 'system';
}
