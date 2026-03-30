export type ReportType = 'weekly' | 'monthly' | 'custom';

export interface Report {
  id: string;
  companyId: string;
  type: ReportType;
  periodStart: string;
  periodEnd: string;
  data: ReportData;
  pdfUrl: string | null;
  generatedAt: Date;
  sentAt: Date | null;
}

export interface ReportData {
  totalConversations: number;
  resolvedConversations: number;
  escalatedConversations: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  botResolutionRate: number;
  customerSatisfaction: number | null;
  topIntents: { intent: string; count: number }[];
  channelBreakdown: { channel: string; count: number }[];
}
