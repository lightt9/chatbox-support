import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB_POOL } from '../../config/database.module';

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'impersonate' | 'assign' | 'escalate' | 'resolve';
export type AuditResource = 'company' | 'user' | 'conversation' | 'operator' | 'settings' | 'session';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@Inject(DB_POOL) private readonly pool: any) {}

  async log(params: {
    companyId: string;
    userId: string;
    userName?: string;
    action: AuditAction;
    resource: AuditResource;
    resourceId?: string;
    details?: Record<string, unknown>;
    ip?: string;
  }) {
    try {
      await this.pool.query(
        `INSERT INTO audit_logs (company_id, user_id, user_name, action, resource, resource_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          params.companyId,
          params.userId,
          params.userName ?? null,
          params.action,
          params.resource,
          params.resourceId ?? null,
          params.details ? JSON.stringify(params.details) : null,
          params.ip ?? null,
        ],
      );
    } catch (err) {
      this.logger.error('Failed to write audit log', err);
    }
  }

  async getByCompany(companyId: string, limit = 50, offset = 0) {
    const { rows } = await this.pool.query(
      `SELECT * FROM audit_logs WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [companyId, limit, offset],
    );
    return rows;
  }

  async getByUser(userId: string, limit = 50) {
    const { rows } = await this.pool.query(
      `SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit],
    );
    return rows;
  }
}
