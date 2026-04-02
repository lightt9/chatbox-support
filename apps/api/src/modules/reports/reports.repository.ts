import { Inject, Injectable } from '@nestjs/common';
import { DB_POOL } from '../../config/database.module';

export interface DateRange {
  fromDate: Date;
  toDate: Date;
}

@Injectable()
export class ReportsRepository {
  constructor(@Inject(DB_POOL) private readonly pool: any) {}

  async getConversationStats(companyId: string, range: DateRange) {
    const { rows } = await this.pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) FILTER (WHERE resolved_at IS NOT NULL), 0)::numeric(10,1) AS avg_resolution_hours,
        COUNT(*) FILTER (WHERE resolved_by = 'ai')::int AS ai_resolved,
        COUNT(*) FILTER (WHERE status = 'resolved')::int AS total_resolved
      FROM conversations
      WHERE company_id = $1 AND created_at >= $2 AND created_at < $3
    `, [companyId, range.fromDate, range.toDate]);
    return rows[0];
  }

  async getCsatAverage(companyId: string, range: DateRange) {
    const { rows } = await this.pool.query(`
      SELECT COALESCE(AVG(score), 0)::numeric(10,2) AS avg_score FROM csat_ratings
      WHERE company_id = $1 AND created_at >= $2 AND created_at < $3
    `, [companyId, range.fromDate, range.toDate]);
    return parseFloat(rows[0].avg_score) || 0;
  }

  async getConversationVolumeByDay(companyId: string, range: DateRange) {
    const { rows } = await this.pool.query(`
      SELECT DATE(created_at) AS date, COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved,
        COUNT(*) FILTER (WHERE status = 'open')::int AS open,
        COUNT(*) FILTER (WHERE status = 'escalated')::int AS escalated
      FROM conversations
      WHERE company_id = $1 AND created_at >= $2 AND created_at < $3
      GROUP BY DATE(created_at) ORDER BY date
    `, [companyId, range.fromDate, range.toDate]);
    return rows;
  }

  async getAgentStats(companyId: string, range: DateRange) {
    const { rows } = await this.pool.query(`
      SELECT
        c.assigned_agent AS agent,
        COUNT(*)::int AS total_conversations,
        COUNT(*) FILTER (WHERE c.status = 'resolved')::int AS resolved,
        COALESCE(AVG(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at))/60) FILTER (WHERE c.resolved_at IS NOT NULL), 0)::int AS avg_resolution_min,
        COALESCE(AVG(EXTRACT(EPOCH FROM (c.first_response_at - c.created_at))/60) FILTER (WHERE c.first_response_at IS NOT NULL), 0)::int AS avg_first_response_min,
        COALESCE(AVG(cr.score)::numeric(10,2), 0) AS avg_csat
      FROM conversations c
      LEFT JOIN csat_ratings cr ON cr.conversation_id = c.id
      WHERE c.company_id = $1 AND c.created_at >= $2 AND c.created_at < $3
        AND c.assigned_agent IS NOT NULL
      GROUP BY c.assigned_agent
      ORDER BY total_conversations DESC
    `, [companyId, range.fromDate, range.toDate]);
    return rows;
  }

  async getResponseTimesByDay(companyId: string, range: DateRange) {
    const { rows } = await this.pool.query(`
      SELECT DATE(created_at) AS date,
        COALESCE(AVG(EXTRACT(EPOCH FROM (first_response_at - created_at))/60) FILTER (WHERE first_response_at IS NOT NULL), 0)::int AS avg_first_response_min,
        COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60) FILTER (WHERE resolved_at IS NOT NULL), 0)::int AS avg_resolution_min
      FROM conversations
      WHERE company_id = $1 AND created_at >= $2 AND created_at < $3
      GROUP BY DATE(created_at) ORDER BY date
    `, [companyId, range.fromDate, range.toDate]);
    return rows;
  }

  async getCsatByDay(companyId: string, range: DateRange) {
    const { rows } = await this.pool.query(`
      SELECT DATE(created_at) AS date,
        AVG(score)::numeric(10,2) AS avg_score,
        COUNT(*)::int AS total_ratings,
        COUNT(*) FILTER (WHERE score >= 4)::int AS positive,
        COUNT(*) FILTER (WHERE score <= 2)::int AS negative
      FROM csat_ratings
      WHERE company_id = $1 AND created_at >= $2 AND created_at < $3
      GROUP BY DATE(created_at) ORDER BY date
    `, [companyId, range.fromDate, range.toDate]);
    return rows;
  }

  async getChannelBreakdown(companyId: string, range: DateRange) {
    const { rows } = await this.pool.query(`
      SELECT channel, COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved
      FROM conversations
      WHERE company_id = $1 AND created_at >= $2 AND created_at < $3
      GROUP BY channel ORDER BY total DESC
    `, [companyId, range.fromDate, range.toDate]);
    return rows;
  }

  async getRecentConversations(companyId: string, range: DateRange, limit = 50) {
    const { rows } = await this.pool.query(`
      SELECT id, customer_name, subject, assigned_agent, channel, status, resolved_by,
        EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - created_at))/60 AS duration_min,
        created_at
      FROM conversations
      WHERE company_id = $1 AND created_at >= $2 AND created_at < $3
      ORDER BY created_at DESC LIMIT $4
    `, [companyId, range.fromDate, range.toDate, limit]);
    return rows;
  }
}
