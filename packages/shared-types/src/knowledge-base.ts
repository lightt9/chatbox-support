export type KBEntryType = 'product' | 'faq' | 'communication_rule' | 'escalation_rule' | 'internal_info';

export interface KBCategory {
  id: string;
  companyId: string;
  parentId: string | null;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface KBEntry {
  id: string;
  companyId: string;
  categoryId: string | null;
  entryType: KBEntryType;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  isPublic: boolean;
  isActive: boolean;
  version: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface KBEntryVersion {
  id: string;
  entryId: string;
  version: number;
  content: string;
  metadata: Record<string, unknown>;
  changedBy: string | null;
  changedAt: Date;
}
