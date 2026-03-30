export type AdminRole = 'super_admin' | 'admin' | 'operator' | 'viewer';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  companyIds: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  companyId: string | null;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  createdAt: Date;
}

export interface QualityTicket {
  id: string;
  companyId: string;
  conversationId: string | null;
  messageId: string | null;
  createdBy: string;
  assignedTo: string | null;
  type: 'incorrect_response' | 'missed_escalation' | 'tone_issue' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  resolution: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: Date;
  resolvedAt: Date | null;
}
