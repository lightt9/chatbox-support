import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB_POOL } from '../../config/database.module';

interface FindAllOptions {
  status?: string;
  search?: string;
  assigned?: string; // 'me' | 'unassigned' | 'others' | 'all'
  agentName?: string;
  starred?: boolean;
  priority?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(@Inject(DB_POOL) private readonly pool: any) {}

  async findAll(companyId: string, options: FindAllOptions = {}) {
    const conditions = ['c.company_id = $1'];
    const params: any[] = [companyId];
    let idx = 2;

    if (options.status) {
      conditions.push(`c.status = $${idx}`);
      params.push(options.status);
      idx++;
    }

    if (options.search) {
      conditions.push(
        `(c.customer_name ILIKE $${idx} OR c.customer_email ILIKE $${idx} OR c.subject ILIKE $${idx})`,
      );
      params.push(`%${options.search}%`);
      idx++;
    }

    if (options.assigned === 'me' && options.agentName) {
      conditions.push(`c.assigned_agent = $${idx}`);
      params.push(options.agentName);
      idx++;
    } else if (options.assigned === 'unassigned') {
      conditions.push('c.assigned_agent IS NULL');
    } else if (options.assigned === 'others' && options.agentName) {
      conditions.push(`c.assigned_agent IS NOT NULL AND c.assigned_agent != $${idx}`);
      params.push(options.agentName);
      idx++;
    }

    if (options.starred) {
      conditions.push('c.starred = true');
    }

    if (options.priority) {
      conditions.push(`c.priority = $${idx}`);
      params.push(options.priority);
      idx++;
    }

    const limit = Math.min(options.limit ?? 50, 100);
    const offset = options.offset ?? 0;

    const query = `
      SELECT
        c.id, c.customer_name, c.customer_email, c.channel, c.subject,
        c.status, c.assigned_agent, c.resolved_by, c.priority,
        c.tags, c.starred, c.internal_notes,
        c.first_response_at, c.resolved_at, c.created_at, c.updated_at,
        (SELECT COUNT(*)::int FROM messages m WHERE m.conversation_id = c.id) AS message_count,
        (SELECT m.body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
        (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
        (SELECT m.sender_type FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_sender_type
      FROM conversations c
      WHERE ${conditions.join(' AND ')}
      ORDER BY
        c.starred DESC,
        CASE c.status WHEN 'escalated' THEN 0 WHEN 'open' THEN 1 ELSE 2 END,
        c.updated_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    const countParams = [...params];
    params.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*)::int AS total FROM conversations c WHERE ${conditions.join(' AND ')}
    `;

    const [dataRes, countRes] = await Promise.all([
      this.pool.query(query, params),
      this.pool.query(countQuery, countParams),
    ]);

    return {
      data: dataRes.rows.map(this.mapConversation),
      meta: { total: countRes.rows[0].total, limit, offset },
    };
  }

  async findOne(companyId: string, id: string) {
    const { rows } = await this.pool.query(
      `SELECT
        c.id, c.customer_name, c.customer_email, c.channel, c.subject,
        c.status, c.assigned_agent, c.resolved_by, c.priority,
        c.tags, c.starred, c.internal_notes,
        c.first_response_at, c.resolved_at, c.created_at, c.updated_at,
        (SELECT COUNT(*)::int FROM messages m WHERE m.conversation_id = c.id) AS message_count
      FROM conversations c
      WHERE c.id = $1 AND c.company_id = $2`,
      [id, companyId],
    );
    return rows.length > 0 ? this.mapConversation(rows[0]) : null;
  }

  async getMessages(companyId: string, conversationId: string) {
    const conv = await this.pool.query(
      'SELECT id FROM conversations WHERE id = $1 AND company_id = $2',
      [conversationId, companyId],
    );
    if (conv.rows.length === 0) return [];

    const { rows } = await this.pool.query(
      `SELECT id, conversation_id, sender_type, sender_name, body, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId],
    );

    return rows.map((r: any) => ({
      id: r.id,
      conversationId: r.conversation_id,
      senderType: r.sender_type,
      senderName: r.sender_name,
      body: r.body,
      createdAt: r.created_at,
    }));
  }

  async sendMessage(
    companyId: string,
    conversationId: string,
    senderType: string,
    senderName: string,
    body: string,
  ) {
    const conv = await this.pool.query(
      'SELECT id, status FROM conversations WHERE id = $1 AND company_id = $2',
      [conversationId, companyId],
    );
    if (conv.rows.length === 0) return null;

    const { rows } = await this.pool.query(
      `INSERT INTO messages (conversation_id, sender_type, sender_name, body)
       VALUES ($1, $2, $3, $4)
       RETURNING id, conversation_id, sender_type, sender_name, body, created_at`,
      [conversationId, senderType, senderName, body],
    );

    await this.pool.query(
      'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
      [conversationId],
    );

    if (senderType === 'agent') {
      await this.pool.query(
        `UPDATE conversations SET
          first_response_at = COALESCE(first_response_at, NOW()),
          assigned_agent = COALESCE(assigned_agent, $2)
        WHERE id = $1`,
        [conversationId, senderName],
      );
    }

    const r = rows[0];
    return {
      id: r.id,
      conversationId: r.conversation_id,
      senderType: r.sender_type,
      senderName: r.sender_name,
      body: r.body,
      createdAt: r.created_at,
    };
  }

  async assign(companyId: string, conversationId: string, agentName: string | null) {
    const { rowCount } = await this.pool.query(
      `UPDATE conversations SET assigned_agent = $3, updated_at = NOW()
       WHERE id = $1 AND company_id = $2`,
      [conversationId, companyId, agentName],
    );
    return rowCount > 0;
  }

  async updateStatus(companyId: string, conversationId: string, status: string) {
    const updates: string[] = ['status = $3', 'updated_at = NOW()'];
    const params: any[] = [conversationId, companyId, status];

    if (status === 'resolved') {
      updates.push('resolved_at = NOW()');
    }

    const { rowCount } = await this.pool.query(
      `UPDATE conversations SET ${updates.join(', ')} WHERE id = $1 AND company_id = $2`,
      params,
    );
    return rowCount > 0;
  }

  async escalate(companyId: string, conversationId: string) {
    return this.updateStatus(companyId, conversationId, 'escalated');
  }

  async resolve(companyId: string, conversationId: string, resolvedBy: string) {
    const { rowCount } = await this.pool.query(
      `UPDATE conversations SET
        status = 'resolved', resolved_by = $3, resolved_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND company_id = $2`,
      [conversationId, companyId, resolvedBy],
    );
    return rowCount > 0;
  }

  async toggleStar(companyId: string, conversationId: string) {
    const { rows } = await this.pool.query(
      `UPDATE conversations SET starred = NOT COALESCE(starred, false), updated_at = NOW()
       WHERE id = $1 AND company_id = $2
       RETURNING starred`,
      [conversationId, companyId],
    );
    return rows.length > 0 ? rows[0].starred : null;
  }

  async setPriority(companyId: string, conversationId: string, priority: string) {
    const { rowCount } = await this.pool.query(
      `UPDATE conversations SET priority = $3, updated_at = NOW()
       WHERE id = $1 AND company_id = $2`,
      [conversationId, companyId, priority],
    );
    return rowCount > 0;
  }

  async updateTags(companyId: string, conversationId: string, tags: string[]) {
    const { rowCount } = await this.pool.query(
      `UPDATE conversations SET tags = $3::jsonb, updated_at = NOW()
       WHERE id = $1 AND company_id = $2`,
      [conversationId, companyId, JSON.stringify(tags)],
    );
    return rowCount > 0;
  }

  async updateNotes(companyId: string, conversationId: string, notes: string) {
    const { rowCount } = await this.pool.query(
      `UPDATE conversations SET internal_notes = $3, updated_at = NOW()
       WHERE id = $1 AND company_id = $2`,
      [conversationId, companyId, notes],
    );
    return rowCount > 0;
  }

  async getStatusCounts(companyId: string, agentName?: string) {
    const { rows } = await this.pool.query(
      `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'open')::int AS open,
        COUNT(*) FILTER (WHERE status = 'escalated')::int AS escalated,
        COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved,
        COUNT(*) FILTER (WHERE assigned_agent IS NULL AND status != 'resolved')::int AS unassigned,
        COUNT(*) FILTER (WHERE starred = true)::int AS starred,
        COUNT(*) FILTER (WHERE assigned_agent = $2)::int AS mine,
        COUNT(*) FILTER (WHERE assigned_agent IS NOT NULL AND assigned_agent != $2 AND status != 'resolved')::int AS others
       FROM conversations WHERE company_id = $1`,
      [companyId, agentName ?? ''],
    );
    return rows[0];
  }

  private mapConversation(r: any) {
    return {
      id: r.id,
      customerName: r.customer_name,
      customerEmail: r.customer_email,
      channel: r.channel,
      subject: r.subject,
      status: r.status,
      assignedAgent: r.assigned_agent,
      resolvedBy: r.resolved_by,
      priority: r.priority ?? 'normal',
      tags: r.tags ?? [],
      starred: r.starred ?? false,
      internalNotes: r.internal_notes ?? '',
      firstResponseAt: r.first_response_at,
      resolvedAt: r.resolved_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      messageCount: r.message_count,
      lastMessage: r.last_message,
      lastMessageAt: r.last_message_at,
      lastSenderType: r.last_sender_type,
    };
  }
}
