import { Injectable } from '@nestjs/common';
import { ReportsRepository, type DateRange } from './reports.repository';

@Injectable()
export class ReportsService {
  constructor(private readonly repo: ReportsRepository) {}

  private computeDateRanges(from?: string, to?: string): { current: DateRange; previous: DateRange } {
    const now = new Date();
    const toDate = to ? new Date(to) : now;
    const fromDate = from ? new Date(from) : new Date(now.getTime() - 30 * 86400000);
    const periodLength = toDate.getTime() - fromDate.getTime();
    return {
      current: { fromDate, toDate },
      previous: { fromDate: new Date(fromDate.getTime() - periodLength), toDate: fromDate },
    };
  }

  private pctChange(curr: number, prev: number): number {
    return prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);
  }

  async getOverview(companyId: string, from?: string, to?: string) {
    const { current, previous } = this.computeDateRanges(from, to);

    const [curr, prev, currCsat, prevCsat] = await Promise.all([
      this.repo.getConversationStats(companyId, current),
      this.repo.getConversationStats(companyId, previous),
      this.repo.getCsatAverage(companyId, current),
      this.repo.getCsatAverage(companyId, previous),
    ]);

    const aiRate = curr.total_resolved > 0 ? Math.round((curr.ai_resolved / curr.total_resolved) * 100) : 0;
    const prevAiRate = prev.total_resolved > 0 ? Math.round((prev.ai_resolved / prev.total_resolved) * 100) : 0;

    return {
      totalConversations: { value: curr.total, change: this.pctChange(curr.total, prev.total) },
      avgResolutionTime: {
        value: parseFloat(curr.avg_resolution_hours) || 0,
        change: this.pctChange(parseFloat(curr.avg_resolution_hours) || 0, parseFloat(prev.avg_resolution_hours) || 0),
      },
      csatScore: { value: currCsat, change: parseFloat((currCsat - prevCsat).toFixed(2)) },
      aiResolutionRate: { value: aiRate, change: aiRate - prevAiRate },
    };
  }

  async getConversationVolume(companyId: string, from?: string, to?: string) {
    const { current } = this.computeDateRanges(from, to);
    const rows = await this.repo.getConversationVolumeByDay(companyId, current);
    return rows.map((r: any) => ({
      date: r.date, total: r.total, resolved: r.resolved, open: r.open, escalated: r.escalated,
    }));
  }

  async getAgentPerformance(companyId: string, from?: string, to?: string) {
    const { current } = this.computeDateRanges(from, to);
    const rows = await this.repo.getAgentStats(companyId, current);
    return rows.map((r: any) => ({
      agent: r.agent,
      totalConversations: r.total_conversations,
      resolved: r.resolved,
      avgResolutionMin: r.avg_resolution_min || 0,
      avgFirstResponseMin: r.avg_first_response_min || 0,
      avgCsat: parseFloat(r.avg_csat) || 0,
    }));
  }

  async getResponseTimes(companyId: string, from?: string, to?: string) {
    const { current } = this.computeDateRanges(from, to);
    const rows = await this.repo.getResponseTimesByDay(companyId, current);
    return rows.map((r: any) => ({
      date: r.date,
      avgFirstResponseMin: r.avg_first_response_min || 0,
      avgResolutionMin: r.avg_resolution_min || 0,
    }));
  }

  async getCsat(companyId: string, from?: string, to?: string) {
    const { current } = this.computeDateRanges(from, to);
    const rows = await this.repo.getCsatByDay(companyId, current);
    return rows.map((r: any) => ({
      date: r.date,
      avgScore: parseFloat(r.avg_score) || 0,
      totalRatings: r.total_ratings,
      positive: r.positive,
      negative: r.negative,
    }));
  }

  async getChannelBreakdown(companyId: string, from?: string, to?: string) {
    const { current } = this.computeDateRanges(from, to);
    const rows = await this.repo.getChannelBreakdown(companyId, current);
    return rows.map((r: any) => ({ channel: r.channel, total: r.total, resolved: r.resolved }));
  }

  async getRecentConversations(companyId: string, from?: string, to?: string) {
    const { current } = this.computeDateRanges(from, to);
    const rows = await this.repo.getRecentConversations(companyId, current);
    return rows.map((r: any) => ({
      id: r.id, customerName: r.customer_name, subject: r.subject,
      agent: r.assigned_agent, channel: r.channel, status: r.status,
      resolvedBy: r.resolved_by, durationMin: Math.round(r.duration_min),
      createdAt: r.created_at,
    }));
  }

  async exportData(companyId: string, from?: string, to?: string) {
    const [overview, volume, agents, responseTimes, csat, channels, conversations] = await Promise.all([
      this.getOverview(companyId, from, to),
      this.getConversationVolume(companyId, from, to),
      this.getAgentPerformance(companyId, from, to),
      this.getResponseTimes(companyId, from, to),
      this.getCsat(companyId, from, to),
      this.getChannelBreakdown(companyId, from, to),
      this.getRecentConversations(companyId, from, to),
    ]);
    return { overview, volume, agents, responseTimes, csat, channels, conversations };
  }
}
