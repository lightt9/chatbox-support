import { Inject, Injectable } from '@nestjs/common';
import { DB_POOL } from '../../config/database.module';

/**
 * Actual DB schema (verified against live database):
 *
 * conversations: id, company_id, customer_name, customer_email, channel,
 *   subject, status ('open'|'resolved'|'escalated'), assigned_agent (text),
 *   resolved_by ('ai'|'agent'|null), first_response_at, resolved_at,
 *   created_at, updated_at
 *
 * messages: id, conversation_id, sender_type ('customer'|'agent'|'ai'),
 *   sender_name (text), body (text), created_at
 *
 * operators: id, company_id, name, email, status, role, active, ...
 *
 * leads: id, company_id, display_id, name, email, source, status,
 *   rating, score, intent, conversation_id, created_at, ...
 */

type Period = '24h' | '7d' | '30d';

function periodToInterval(period: Period): string {
  switch (period) {
    case '24h': return '24 hours';
    case '7d': return '7 days';
    case '30d': return '30 days';
    default: return '7 days';
  }
}

@Injectable()
export class DashboardService {
  constructor(@Inject(DB_POOL) private readonly pool: any) {}

  async getMetrics(companyId: string, period: Period) {
    const interval = periodToInterval(period);

    // Current period metrics
    const currentQuery = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'open')::int AS active_conversations,
        COUNT(*)::int AS total_conversations,
        COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved_conversations,
        COUNT(*) FILTER (WHERE status = 'escalated')::int AS escalated_conversations,
        COUNT(*) FILTER (WHERE resolved_by = 'ai')::int AS ai_resolved
      FROM conversations
      WHERE company_id = $1 AND created_at >= NOW() - $2::interval
    `;

    // Previous period metrics (for trend comparison)
    const previousQuery = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'open')::int AS active_conversations,
        COUNT(*)::int AS total_conversations,
        COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved_conversations,
        COUNT(*) FILTER (WHERE status = 'escalated')::int AS escalated_conversations,
        COUNT(*) FILTER (WHERE resolved_by = 'ai')::int AS ai_resolved
      FROM conversations
      WHERE company_id = $1
        AND created_at >= NOW() - ($2::interval * 2)
        AND created_at < NOW() - $2::interval
    `;

    // Avg response time — use first_response_at if available, else compute from messages
    const avgResponseQuery = `
      SELECT COALESCE(
        AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)))
          FILTER (WHERE first_response_at IS NOT NULL),
        0
      )::float AS avg_seconds
      FROM conversations
      WHERE company_id = $1 AND created_at >= NOW() - $2::interval
    `;

    const prevAvgResponseQuery = `
      SELECT COALESCE(
        AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)))
          FILTER (WHERE first_response_at IS NOT NULL),
        0
      )::float AS avg_seconds
      FROM conversations
      WHERE company_id = $1
        AND created_at >= NOW() - ($2::interval * 2)
        AND created_at < NOW() - $2::interval
    `;

    const [currentRes, previousRes, avgRes, prevAvgRes] = await Promise.all([
      this.pool.query(currentQuery, [companyId, interval]),
      this.pool.query(previousQuery, [companyId, interval]),
      this.pool.query(avgResponseQuery, [companyId, interval]),
      this.pool.query(prevAvgResponseQuery, [companyId, interval]),
    ]);

    const current = currentRes.rows[0];
    const previous = previousRes.rows[0];

    const resolutionRate = current.total_conversations > 0
      ? (current.resolved_conversations / current.total_conversations) * 100
      : 0;

    const prevResolutionRate = previous.total_conversations > 0
      ? (previous.resolved_conversations / previous.total_conversations) * 100
      : 0;

    const escalationRate = current.total_conversations > 0
      ? (current.escalated_conversations / current.total_conversations) * 100
      : 0;

    const prevEscalationRate = previous.total_conversations > 0
      ? (previous.escalated_conversations / previous.total_conversations) * 100
      : 0;

    const aiResolutionRate = current.resolved_conversations > 0
      ? (current.ai_resolved / current.resolved_conversations) * 100
      : 0;

    const prevAiResolutionRate = previous.resolved_conversations > 0
      ? (previous.ai_resolved / previous.resolved_conversations) * 100
      : 0;

    return {
      activeConversations: current.active_conversations,
      resolutionRate: Math.round(resolutionRate * 10) / 10,
      avgResponseTime: Math.round(avgRes.rows[0].avg_seconds),
      aiResolutionRate: Math.round(aiResolutionRate * 10) / 10,
      escalationRate: Math.round(escalationRate * 10) / 10,
      previousPeriod: {
        activeConversations: previous.active_conversations,
        resolutionRate: Math.round(prevResolutionRate * 10) / 10,
        avgResponseTime: Math.round(prevAvgRes.rows[0].avg_seconds),
        aiResolutionRate: Math.round(prevAiResolutionRate * 10) / 10,
        escalationRate: Math.round(prevEscalationRate * 10) / 10,
      },
    };
  }

  async getConversationsOverTime(companyId: string, period: Period) {
    const query = `
      SELECT
        d::date AS date,
        COUNT(c.id)::int AS total,
        COUNT(c.id) FILTER (WHERE c.status = 'resolved')::int AS resolved,
        COUNT(c.id) FILTER (WHERE c.status = 'escalated')::int AS escalated
      FROM generate_series(
        (NOW() - $2::interval)::date,
        NOW()::date,
        '1 day'::interval
      ) AS d
      LEFT JOIN conversations c
        ON c.company_id = $1
        AND c.created_at::date = d::date
      GROUP BY d::date
      ORDER BY d::date
    `;

    const { rows } = await this.pool.query(query, [companyId, periodToInterval(period)]);

    return {
      data: rows.map((r: any) => ({
        date: r.date.toISOString().split('T')[0],
        total: r.total,
        resolved: r.resolved,
        escalated: r.escalated,
      })),
    };
  }

  async getAgentPerformance(companyId: string, period: Period) {
    const interval = periodToInterval(period);

    // assigned_agent is a text name, so we join on operators.name
    const query = `
      SELECT
        o.id,
        o.name,
        o.avatar_url,
        o.status,
        COUNT(DISTINCT c_active.id)::int AS active_chats,
        COUNT(DISTINCT c_resolved.id)::int AS resolved_chats,
        COALESCE(AVG(
          EXTRACT(EPOCH FROM (c_resp.first_response_at - c_resp.created_at))
        ) FILTER (WHERE c_resp.first_response_at IS NOT NULL), 0)::float AS avg_response_time,
        0::float AS rating
      FROM operators o
      LEFT JOIN conversations c_active
        ON c_active.assigned_agent = o.name
        AND c_active.company_id = $1
        AND c_active.status = 'open'
      LEFT JOIN conversations c_resolved
        ON c_resolved.assigned_agent = o.name
        AND c_resolved.company_id = $1
        AND c_resolved.status = 'resolved'
        AND c_resolved.resolved_at >= NOW() - $2::interval
      LEFT JOIN conversations c_resp
        ON c_resp.assigned_agent = o.name
        AND c_resp.company_id = $1
        AND c_resp.created_at >= NOW() - $2::interval
      WHERE o.company_id = $1 AND o.active = true
      GROUP BY o.id, o.name, o.avatar_url, o.status
      ORDER BY resolved_chats DESC
    `;

    const { rows } = await this.pool.query(query, [companyId, interval]);

    return {
      data: rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        avatarUrl: r.avatar_url,
        status: r.status,
        activeChats: r.active_chats,
        resolvedChats: r.resolved_chats,
        avgResponseTime: Math.round(r.avg_response_time),
        rating: Math.round(r.rating * 10) / 10,
      })),
    };
  }

  async getActivity(companyId: string, limit: number) {
    // Unified activity feed from conversations, messages, and leads
    // Uses actual column names: customer_name, body, sender_name, resolved_by
    const query = `
      (
        SELECT
          c.id,
          'conversation_started' AS type,
          'New conversation from ' || COALESCE(c.customer_name, c.customer_email, 'Unknown') AS description,
          c.created_at AS timestamp,
          jsonb_build_object(
            'conversationId', c.id,
            'customerName', COALESCE(c.customer_name, c.customer_email, 'Unknown'),
            'channel', c.channel
          ) AS metadata
        FROM conversations c
        WHERE c.company_id = $1
        ORDER BY c.created_at DESC
        LIMIT $2
      )
      UNION ALL
      (
        SELECT
          c.id,
          'conversation_resolved' AS type,
          'Conversation resolved by ' || COALESCE(c.resolved_by, 'system') AS description,
          c.resolved_at AS timestamp,
          jsonb_build_object(
            'conversationId', c.id,
            'customerName', COALESCE(c.customer_name, c.customer_email, 'Unknown')
          ) AS metadata
        FROM conversations c
        WHERE c.company_id = $1 AND c.status = 'resolved' AND c.resolved_at IS NOT NULL
        ORDER BY c.resolved_at DESC
        LIMIT $2
      )
      UNION ALL
      (
        SELECT
          m.id,
          'operator_replied' AS type,
          COALESCE(m.sender_name, 'Agent') || ' replied in conversation' AS description,
          m.created_at AS timestamp,
          jsonb_build_object(
            'conversationId', m.conversation_id,
            'operatorName', COALESCE(m.sender_name, 'Agent')
          ) AS metadata
        FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE c.company_id = $1 AND m.sender_type = 'agent'
        ORDER BY m.created_at DESC
        LIMIT $2
      )
      UNION ALL
      (
        SELECT
          l.id,
          'lead_created' AS type,
          'New lead: ' || l.name AS description,
          l.created_at AS timestamp,
          jsonb_build_object(
            'leadId', l.id,
            'leadName', l.name,
            'rating', l.rating
          ) AS metadata
        FROM leads l
        WHERE l.company_id = $1
        ORDER BY l.created_at DESC
        LIMIT $2
      )
      ORDER BY timestamp DESC
      LIMIT $2
    `;

    const { rows } = await this.pool.query(query, [companyId, limit]);

    return {
      data: rows.map((r: any) => ({
        id: r.id,
        type: r.type,
        description: r.description,
        timestamp: r.timestamp,
        metadata: r.metadata,
      })),
    };
  }

  async getLeadsSummary(companyId: string, period: Period) {
    const interval = periodToInterval(period);

    const query = `
      SELECT
        COUNT(*)::int AS total_leads,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS new_leads_today,
        COUNT(*) FILTER (WHERE status = 'converted')::int AS converted,
        COUNT(*) FILTER (WHERE source = 'chat_widget')::int AS from_chat
      FROM leads
      WHERE company_id = $1 AND created_at >= NOW() - $2::interval
    `;

    const { rows } = await this.pool.query(query, [companyId, interval]);
    const r = rows[0];

    return {
      totalLeads: r.total_leads,
      newLeadsToday: r.new_leads_today,
      conversionRate: r.total_leads > 0
        ? Math.round((r.converted / r.total_leads) * 1000) / 10
        : 0,
      leadsFromChat: r.from_chat,
    };
  }

  async getLiveStats(companyId: string) {
    // No last_message_at column — approximate "currently active" from recent messages
    const [convRes, opRes, recentRes] = await Promise.all([
      this.pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'open')::int AS active_chats,
          COUNT(*) FILTER (WHERE status = 'escalated')::int AS pending_chats
        FROM conversations
        WHERE company_id = $1
      `, [companyId]),
      this.pool.query(`
        SELECT COUNT(*)::int AS online_operators
        FROM operators
        WHERE company_id = $1 AND active = true AND status = 'online'
      `, [companyId]),
      this.pool.query(`
        SELECT COUNT(DISTINCT m.conversation_id)::int AS currently_active
        FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE c.company_id = $1 AND c.status = 'open'
          AND m.created_at >= NOW() - INTERVAL '5 minutes'
      `, [companyId]),
    ]);

    return {
      activeChats: convRes.rows[0].active_chats,
      pendingChats: convRes.rows[0].pending_chats,
      currentlyTyping: recentRes.rows[0].currently_active,
      onlineOperators: opRes.rows[0].online_operators,
    };
  }
}
