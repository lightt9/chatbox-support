import { Inject, Injectable } from '@nestjs/common';
import { DB_POOL } from '../../config/database.module';

const SELECT_COLS = `id, display_id, name, email, phone, company_name, title, source, status, rating, assigned_to, notes, tags, lost_reason, converted_at, last_contacted, conversation_id, first_message, last_message, message_count, custom_fields, intent, score, ai_summary, created_at, updated_at`;

export function mapLeadRow(r: any) {
  return {
    id: r.id,
    displayId: r.display_id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    companyName: r.company_name,
    title: r.title,
    source: r.source,
    status: r.status,
    rating: r.rating,
    assignedTo: r.assigned_to,
    notes: r.notes,
    tags: r.tags ?? [],
    lostReason: r.lost_reason,
    convertedAt: r.converted_at,
    lastContacted: r.last_contacted,
    conversationId: r.conversation_id,
    firstMessage: r.first_message,
    lastMessage: r.last_message,
    messageCount: r.message_count ?? 0,
    customFields: r.custom_fields ?? {},
    intent: r.intent,
    score: r.score ?? 0,
    aiSummary: r.ai_summary,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

@Injectable()
export class LeadRepository {
  constructor(@Inject(DB_POOL) private readonly pool: any) {}

  async findAll(companyId: string, filters: { status?: string; rating?: string; search?: string }) {
    const conds: string[] = ['company_id = $1', "source = 'chat_widget'"];
    const params: any[] = [companyId];
    let idx = 2;

    if (filters.status) { conds.push(`status = $${idx}`); params.push(filters.status); idx++; }
    if (filters.rating) { conds.push(`rating = $${idx}`); params.push(filters.rating); idx++; }
    if (filters.search) {
      conds.push(`(name ILIKE $${idx} OR email ILIKE $${idx} OR company_name ILIKE $${idx} OR display_id ILIKE $${idx})`);
      params.push(`%${filters.search}%`); idx++;
    }

    const { rows } = await this.pool.query(
      `SELECT ${SELECT_COLS} FROM leads WHERE ${conds.join(' AND ')} ORDER BY created_at DESC`, params,
    );
    return rows.map(mapLeadRow);
  }

  async countByStatus(companyId: string): Promise<Record<string, number>> {
    const { rows } = await this.pool.query(
      `SELECT status, COUNT(*)::int as count FROM leads WHERE company_id = $1 AND source = 'chat_widget' GROUP BY status`, [companyId],
    );
    const counts: Record<string, number> = {};
    for (const c of rows) counts[c.status] = c.count;
    return counts;
  }

  async findById(companyId: string, id: string) {
    const { rows } = await this.pool.query(
      `SELECT ${SELECT_COLS} FROM leads WHERE id = $1 AND company_id = $2`, [id, companyId],
    );
    return rows.length ? mapLeadRow(rows[0]) : null;
  }

  async findByEmail(companyId: string, email: string) {
    const { rows } = await this.pool.query(
      `SELECT ${SELECT_COLS} FROM leads WHERE company_id = $1 AND email = $2 LIMIT 1`, [companyId, email],
    );
    return rows.length ? mapLeadRow(rows[0]) : null;
  }

  async findByConversationId(conversationId: string) {
    const { rows } = await this.pool.query(
      `SELECT id, rating, status, intent, score, message_count FROM leads WHERE conversation_id = $1 LIMIT 1`, [conversationId],
    );
    return rows.length ? rows[0] : null;
  }

  async nextDisplayId(): Promise<string> {
    const { rows } = await this.pool.query("SELECT 'LD-' || LPAD(nextval('lead_seq')::text, 4, '0') as did");
    return rows[0].did;
  }

  async insert(data: Record<string, any>) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await this.pool.query(
      `INSERT INTO leads (${keys.join(', ')}) VALUES (${placeholders}) RETURNING ${SELECT_COLS}`,
      values,
    );
    return mapLeadRow(rows[0]);
  }

  async update(id: string, companyId: string, sets: string[], params: any[]) {
    const idx = params.length + 1;
    params.push(id, companyId);
    const { rows } = await this.pool.query(
      `UPDATE leads SET ${sets.join(', ')} WHERE id = $${idx} AND company_id = $${idx + 1} RETURNING ${SELECT_COLS}`,
      params,
    );
    return rows.length ? mapLeadRow(rows[0]) : null;
  }

  async updateByConversation(conversationId: string, sets: string[], params: any[]) {
    const idx = params.length + 1;
    params.push(conversationId);
    await this.pool.query(
      `UPDATE leads SET ${sets.join(', ')} WHERE conversation_id = $${idx}`,
      params,
    );
  }

  async updateById(id: string, data: Record<string, any>) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const idx = values.length + 1;
    values.push(id);
    const { rows } = await this.pool.query(
      `UPDATE leads SET ${setClause} WHERE id = $${idx} RETURNING ${SELECT_COLS}`,
      values,
    );
    return rows.length ? mapLeadRow(rows[0]) : null;
  }

  async delete(companyId: string, id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      'DELETE FROM leads WHERE id = $1 AND company_id = $2', [id, companyId],
    );
    return rowCount > 0;
  }
}
