import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DB_POOL } from '../../config/database.module';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

function mapRow(t: any) {
  return {
    id: t.id,
    displayId: t.display_id,
    conversationTitle: t.conversation_title,
    agentName: t.agent_name,
    ticketType: t.ticket_type,
    severity: t.severity,
    status: t.status,
    notes: t.notes,
    attachments: t.attachments ?? [],
    badges: t.badges ?? [],
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

const SELECT_COLS = `id, display_id, conversation_title, agent_name, ticket_type,
  severity, status, notes, attachments, badges, created_at, updated_at`;

@Injectable()
export class QualityService {
  constructor(@Inject(DB_POOL) private readonly pool: any) {}

  async findAll(
    companyId: string,
    filters: {
      search?: string;
      status?: string;
      severity?: string;
      ticketType?: string;
    },
  ) {
    const conditions: string[] = ['company_id = $1'];
    const params: any[] = [companyId];
    let idx = 2;

    if (filters.status) {
      conditions.push(`status = $${idx}`);
      params.push(filters.status);
      idx++;
    }
    if (filters.severity) {
      conditions.push(`severity = $${idx}`);
      params.push(filters.severity);
      idx++;
    }
    if (filters.ticketType) {
      conditions.push(`ticket_type = $${idx}`);
      params.push(filters.ticketType);
      idx++;
    }
    if (filters.search) {
      conditions.push(
        `(conversation_title ILIKE $${idx} OR agent_name ILIKE $${idx} OR display_id ILIKE $${idx})`,
      );
      params.push(`%${filters.search}%`);
      idx++;
    }

    const where = conditions.join(' AND ');

    const { rows: tickets } = await this.pool.query(
      `SELECT ${SELECT_COLS} FROM quality_tickets WHERE ${where} ORDER BY created_at DESC`,
      params,
    );

    const { rows: countRows } = await this.pool.query(
      `SELECT status, COUNT(*)::int as count FROM quality_tickets WHERE company_id = $1 GROUP BY status`,
      [companyId],
    );

    const counts: Record<string, number> = {};
    for (const r of countRows) counts[r.status] = r.count;

    return {
      tickets: tickets.map(mapRow),
      counts: {
        open: counts.open ?? 0,
        investigating: counts.investigating ?? 0,
        resolved: counts.resolved ?? 0,
      },
    };
  }

  async findOne(companyId: string, ticketId: string) {
    const { rows } = await this.pool.query(
      `SELECT ${SELECT_COLS} FROM quality_tickets WHERE id = $1 AND company_id = $2`,
      [ticketId, companyId],
    );
    if (rows.length === 0) throw new NotFoundException('Ticket not found');
    return mapRow(rows[0]);
  }

  async create(companyId: string, userId: string, dto: CreateTicketDto) {
    const { rows: seqRows } = await this.pool.query(
      "SELECT 'QA-' || LPAD(nextval('quality_ticket_seq')::text, 3, '0') as display_id",
    );

    const initialBadges = [
      { type: 'status', value: 'open' },
      { type: 'severity', value: dto.severity },
    ];

    const { rows } = await this.pool.query(
      `INSERT INTO quality_tickets
         (display_id, company_id, conversation_title, agent_name, ticket_type, severity, status, notes, badges, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'open', $7, $8, $9)
       RETURNING ${SELECT_COLS}`,
      [
        seqRows[0].display_id,
        companyId,
        dto.conversationTitle,
        dto.agentName,
        dto.ticketType,
        dto.severity,
        dto.notes ?? null,
        JSON.stringify(initialBadges),
        userId,
      ],
    );
    return mapRow(rows[0]);
  }

  async update(companyId: string, ticketId: string, dto: UpdateTicketDto) {
    const sets: string[] = ['updated_at = NOW()'];
    const params: any[] = [];
    let idx = 1;

    if (dto.status !== undefined) {
      sets.push(`status = $${idx}`);
      params.push(dto.status);
      idx++;
      if (dto.status === 'resolved') sets.push('resolved_at = NOW()');
    }
    if (dto.severity !== undefined) {
      sets.push(`severity = $${idx}`);
      params.push(dto.severity);
      idx++;
    }
    if (dto.ticketType !== undefined) {
      sets.push(`ticket_type = $${idx}`);
      params.push(dto.ticketType);
      idx++;
    }
    if (dto.notes !== undefined) {
      sets.push(`notes = $${idx}`);
      params.push(dto.notes);
      idx++;
    }
    params.push(ticketId, companyId);

    const { rows } = await this.pool.query(
      `UPDATE quality_tickets SET ${sets.join(', ')} WHERE id = $${idx} AND company_id = $${idx + 1} RETURNING ${SELECT_COLS}`,
      params,
    );
    if (rows.length === 0) throw new NotFoundException('Ticket not found');
    return mapRow(rows[0]);
  }

  async updateBadges(
    companyId: string,
    ticketId: string,
    badges: Array<{ type: string; value: string }>,
  ) {
    const { rows } = await this.pool.query(
      `UPDATE quality_tickets SET badges = $1, updated_at = NOW()
       WHERE id = $2 AND company_id = $3
       RETURNING ${SELECT_COLS}`,
      [JSON.stringify(badges), ticketId, companyId],
    );
    if (rows.length === 0) throw new NotFoundException('Ticket not found');
    return mapRow(rows[0]);
  }

  async addAttachment(
    companyId: string,
    ticketId: string,
    file: { filename: string; originalName: string; size: number; mimeType: string },
  ) {
    const { rows: existing } = await this.pool.query(
      'SELECT attachments FROM quality_tickets WHERE id = $1 AND company_id = $2',
      [ticketId, companyId],
    );
    if (existing.length === 0) throw new NotFoundException('Ticket not found');

    const attachments = existing[0].attachments ?? [];
    const newAttachment = {
      id: `att-${Date.now()}`,
      filename: file.filename,
      originalName: file.originalName,
      size: file.size,
      mimeType: file.mimeType,
      url: `/uploads/${file.filename}`,
      uploadedAt: new Date().toISOString(),
    };
    attachments.push(newAttachment);

    const { rows } = await this.pool.query(
      `UPDATE quality_tickets SET attachments = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING ${SELECT_COLS}`,
      [JSON.stringify(attachments), ticketId, companyId],
    );
    return mapRow(rows[0]);
  }

  async removeAttachment(companyId: string, ticketId: string, attachmentId: string) {
    const { rows: existing } = await this.pool.query(
      'SELECT attachments FROM quality_tickets WHERE id = $1 AND company_id = $2',
      [ticketId, companyId],
    );
    if (existing.length === 0) throw new NotFoundException('Ticket not found');

    const attachments = (existing[0].attachments ?? []).filter(
      (a: any) => a.id !== attachmentId,
    );

    const { rows } = await this.pool.query(
      `UPDATE quality_tickets SET attachments = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING ${SELECT_COLS}`,
      [JSON.stringify(attachments), ticketId, companyId],
    );
    return mapRow(rows[0]);
  }

  async remove(companyId: string, ticketId: string) {
    const { rowCount } = await this.pool.query(
      'DELETE FROM quality_tickets WHERE id = $1 AND company_id = $2',
      [ticketId, companyId],
    );
    if (rowCount === 0) throw new NotFoundException('Ticket not found');
    return { message: 'Ticket deleted' };
  }
}
