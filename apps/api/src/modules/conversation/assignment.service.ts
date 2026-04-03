import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB_POOL } from '../../config/database.module';

export type AssignmentStrategy = 'round_robin' | 'least_busy' | 'manual';

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);
  private roundRobinIndex = 0;

  constructor(@Inject(DB_POOL) private readonly pool: any) {}

  /** Auto-assign a conversation to the best available agent */
  async autoAssign(
    companyId: string,
    conversationId: string,
    strategy: AssignmentStrategy = 'least_busy',
  ): Promise<string | null> {
    if (strategy === 'manual') return null;

    const agent = strategy === 'round_robin'
      ? await this.roundRobin(companyId)
      : await this.leastBusy(companyId);

    if (!agent) {
      this.logger.warn(`No available agents for company ${companyId}`);
      return null;
    }

    await this.pool.query(
      `UPDATE conversations SET assigned_agent = $2, updated_at = NOW() WHERE id = $1`,
      [conversationId, agent.name],
    );

    this.logger.log(`Auto-assigned conversation ${conversationId} to ${agent.name} (${strategy})`);
    return agent.name;
  }

  /** Round-robin: cycle through online agents */
  private async roundRobin(companyId: string) {
    const agents = await this.getAvailableAgents(companyId);
    if (agents.length === 0) return null;

    this.roundRobinIndex = (this.roundRobinIndex + 1) % agents.length;
    return agents[this.roundRobinIndex];
  }

  /** Least-busy: agent with fewest active conversations */
  private async leastBusy(companyId: string) {
    const { rows } = await this.pool.query(`
      SELECT o.name, o.id,
        COALESCE(
          (SELECT COUNT(*)::int FROM conversations c
           WHERE c.assigned_agent = o.name AND c.company_id = $1 AND c.status = 'open'),
          0
        ) AS active_count
      FROM operators o
      WHERE o.company_id = $1 AND o.active = true AND o.status = 'online'
      ORDER BY active_count ASC, o.name ASC
      LIMIT 1
    `, [companyId]);

    return rows.length > 0 ? rows[0] : null;
  }

  /** Get all online agents for a company */
  private async getAvailableAgents(companyId: string) {
    const { rows } = await this.pool.query(
      `SELECT id, name FROM operators
       WHERE company_id = $1 AND active = true AND status = 'online'
       ORDER BY name`,
      [companyId],
    );
    return rows;
  }
}
