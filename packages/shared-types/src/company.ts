export interface Company {
  id: string;
  name: string;
  slug: string;
  primaryLanguage: string;
  additionalLanguages: string[];
  timezone: string;
  dataRetentionDays: number;
  settings: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanySchedule {
  id: string;
  companyId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface CompanyChannel {
  id: string;
  companyId: string;
  channelType: ChannelType;
  webhookUrl: string | null;
  isActive: boolean;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type ChannelType = 'whatsapp' | 'instagram' | 'messenger' | 'viber' | 'bitrix24' | 'amocrm';
