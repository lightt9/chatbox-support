import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, or, ilike, sql, count, desc } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { DATABASE } from '../../config/database.module';
import { operators, teams, operatorTeams } from '../../database/schema';
import { conversations } from '../../database/schema';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';
import { QueryOperatorDto } from './dto/query-operator.dto';

interface CurrentUser {
  id: string;
  email: string;
  role: string;
  companyId: string;
}

@Injectable()
export class OperatorsService {
  constructor(@Inject(DATABASE) private readonly db: any) {}

  async findAll(companyId: string, query: QueryOperatorDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(operators.company_id, companyId)];

    if (query.role) {
      conditions.push(eq(operators.role, query.role));
    }
    if (query.status) {
      conditions.push(eq(operators.status, query.status));
    }
    if (query.active !== undefined) {
      conditions.push(eq(operators.active, query.active === 'true'));
    }
    if (query.search) {
      conditions.push(
        or(
          ilike(operators.name, `%${query.search}%`),
          ilike(operators.email, `%${query.search}%`),
        )!,
      );
    }

    const whereClause = and(...conditions);

    const [items, totalResult] = await Promise.all([
      this.db
        .select({
          id: operators.id,
          companyId: operators.company_id,
          email: operators.email,
          name: operators.name,
          avatarUrl: operators.avatar_url,
          role: operators.role,
          status: operators.status,
          phone: operators.phone,
          timezone: operators.timezone,
          language: operators.language,
          maxConcurrentChats: operators.max_concurrent_chats,
          skills: operators.skills,
          languages: operators.languages,
          active: operators.active,
          lastActiveAt: operators.last_active_at,
          createdAt: operators.created_at,
          updatedAt: operators.updated_at,
        })
        .from(operators)
        .where(whereClause)
        .orderBy(desc(operators.created_at))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(operators)
        .where(whereClause),
    ]);

    // Fetch conversation stats for each operator
    const operatorIds = items.map((op: any) => op.id);
    const stats = await this.getOperatorStats(operatorIds, companyId);

    const enrichedItems = items.map((op: any) => ({
      ...op,
      stats: stats[op.id] ?? { activeConversations: 0, resolvedToday: 0, avgRating: 0 },
    }));

    return {
      data: enrichedItems,
      meta: {
        total: totalResult[0]?.total ?? 0,
        page,
        limit,
      },
    };
  }

  async findOne(companyId: string, id: string) {
    const [operator] = await this.db
      .select({
        id: operators.id,
        companyId: operators.company_id,
        email: operators.email,
        name: operators.name,
        avatarUrl: operators.avatar_url,
        role: operators.role,
        status: operators.status,
        phone: operators.phone,
        timezone: operators.timezone,
        language: operators.language,
        notes: operators.notes,
        maxConcurrentChats: operators.max_concurrent_chats,
        skills: operators.skills,
        languages: operators.languages,
        active: operators.active,
        lastActiveAt: operators.last_active_at,
        createdAt: operators.created_at,
        updatedAt: operators.updated_at,
      })
      .from(operators)
      .where(and(eq(operators.id, id), eq(operators.company_id, companyId)))
      .limit(1);

    if (!operator) {
      throw new NotFoundException(`Operator ${id} not found`);
    }

    // Fetch teams
    const teamRows = await this.db
      .select({
        teamId: teams.id,
        teamName: teams.name,
      })
      .from(operatorTeams)
      .innerJoin(teams, eq(operatorTeams.team_id, teams.id))
      .where(eq(operatorTeams.operator_id, id));

    const stats = await this.getOperatorStats([id], companyId);

    return {
      ...operator,
      teams: teamRows.map((t: any) => ({ id: t.teamId, name: t.teamName })),
      stats: stats[id] ?? { activeConversations: 0, resolvedToday: 0, avgRating: 0 },
    };
  }

  async create(companyId: string, dto: CreateOperatorDto) {
    // Check for duplicate email within company
    const [existing] = await this.db
      .select({ id: operators.id })
      .from(operators)
      .where(
        and(eq(operators.company_id, companyId), eq(operators.email, dto.email)),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException('An operator with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const [created] = await this.db
      .insert(operators)
      .values({
        company_id: companyId,
        email: dto.email,
        name: dto.name,
        password_hash: passwordHash,
        role: dto.role ?? 'agent',
        avatar_url: dto.avatarUrl,
        phone: dto.phone,
        timezone: dto.timezone ?? 'UTC',
        language: dto.language ?? 'en',
        notes: dto.notes,
        max_concurrent_chats: dto.maxConcurrentChats ?? 5,
        skills: dto.skills ?? [],
        languages: dto.languages ?? ['en'],
        active: dto.active ?? true,
      })
      .returning({
        id: operators.id,
        companyId: operators.company_id,
        email: operators.email,
        name: operators.name,
        role: operators.role,
        status: operators.status,
        active: operators.active,
        createdAt: operators.created_at,
      });

    // Assign teams if provided
    if (dto.teamIds?.length) {
      await this.syncTeams(created.id, dto.teamIds);
    }

    return created;
  }

  async update(companyId: string, id: string, dto: UpdateOperatorDto, currentUser: CurrentUser) {
    // Verify operator belongs to company
    const [existing] = await this.db
      .select({ id: operators.id, role: operators.role })
      .from(operators)
      .where(and(eq(operators.id, id), eq(operators.company_id, companyId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundException(`Operator ${id} not found`);
    }

    // Managers cannot edit admins
    if (currentUser.role === 'manager' && existing.role === 'admin') {
      throw new ForbiddenException('Managers cannot modify admin operators');
    }

    // Check email uniqueness if changing
    if (dto.email) {
      const [duplicate] = await this.db
        .select({ id: operators.id })
        .from(operators)
        .where(
          and(
            eq(operators.company_id, companyId),
            eq(operators.email, dto.email),
          ),
        )
        .limit(1);

      if (duplicate && duplicate.id !== id) {
        throw new ConflictException('An operator with this email already exists');
      }
    }

    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.avatarUrl !== undefined) updateData.avatar_url = dto.avatarUrl;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.timezone !== undefined) updateData.timezone = dto.timezone;
    if (dto.language !== undefined) updateData.language = dto.language;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.maxConcurrentChats !== undefined) updateData.max_concurrent_chats = dto.maxConcurrentChats;
    if (dto.skills !== undefined) updateData.skills = dto.skills;
    if (dto.languages !== undefined) updateData.languages = dto.languages;
    if (dto.active !== undefined) updateData.active = dto.active;
    if (dto.password) {
      updateData.password_hash = await bcrypt.hash(dto.password, 12);
    }

    const [updated] = await this.db
      .update(operators)
      .set(updateData)
      .where(and(eq(operators.id, id), eq(operators.company_id, companyId)))
      .returning({
        id: operators.id,
        companyId: operators.company_id,
        email: operators.email,
        name: operators.name,
        role: operators.role,
        status: operators.status,
        active: operators.active,
        updatedAt: operators.updated_at,
      });

    if (!updated) {
      throw new NotFoundException(`Operator ${id} not found`);
    }

    // Sync teams if provided
    if (dto.teamIds !== undefined) {
      await this.syncTeams(id, dto.teamIds);
    }

    return updated;
  }

  async remove(companyId: string, id: string, currentUser: CurrentUser) {
    const [existing] = await this.db
      .select({ id: operators.id, role: operators.role })
      .from(operators)
      .where(and(eq(operators.id, id), eq(operators.company_id, companyId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundException(`Operator ${id} not found`);
    }

    // Cannot deactivate yourself
    if (existing.id === currentUser.id) {
      throw new ForbiddenException('You cannot deactivate yourself');
    }

    // Managers cannot delete admins
    if (currentUser.role === 'manager' && existing.role === 'admin') {
      throw new ForbiddenException('Managers cannot deactivate admin operators');
    }

    // Soft delete
    await this.db
      .update(operators)
      .set({ active: false, status: 'offline', updated_at: new Date() })
      .where(eq(operators.id, id));

    return { message: 'Operator deactivated' };
  }

  async updateStatus(companyId: string, id: string, status: string) {
    const [updated] = await this.db
      .update(operators)
      .set({
        status,
        last_active_at: new Date(),
        updated_at: new Date(),
      })
      .where(and(eq(operators.id, id), eq(operators.company_id, companyId)))
      .returning({ id: operators.id, status: operators.status });

    if (!updated) {
      throw new NotFoundException(`Operator ${id} not found`);
    }

    return updated;
  }

  // ── Teams ──────────────────────────────────────────────────────────────────

  async findAllTeams(companyId: string) {
    return this.db
      .select({
        id: teams.id,
        name: teams.name,
        description: teams.description,
        active: teams.active,
        createdAt: teams.created_at,
      })
      .from(teams)
      .where(and(eq(teams.company_id, companyId), eq(teams.active, true)))
      .orderBy(teams.name);
  }

  async createTeam(companyId: string, name: string, description?: string) {
    const [team] = await this.db
      .insert(teams)
      .values({ company_id: companyId, name, description })
      .returning({
        id: teams.id,
        name: teams.name,
        description: teams.description,
        createdAt: teams.created_at,
      });

    return team;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async syncTeams(operatorId: string, teamIds: string[]) {
    // Remove existing
    await this.db
      .delete(operatorTeams)
      .where(eq(operatorTeams.operator_id, operatorId));

    // Insert new
    if (teamIds.length > 0) {
      await this.db.insert(operatorTeams).values(
        teamIds.map((teamId) => ({
          operator_id: operatorId,
          team_id: teamId,
        })),
      );
    }
  }

  private async getOperatorStats(
    operatorIds: string[],
    companyId: string,
  ): Promise<Record<string, { activeConversations: number; resolvedToday: number; avgRating: number }>> {
    const emptyStats = () => ({ activeConversations: 0, resolvedToday: 0, avgRating: 0 });

    if (operatorIds.length === 0) return {};

    const statsMap: Record<string, { activeConversations: number; resolvedToday: number; avgRating: number }> = {};
    for (const id of operatorIds) {
      statsMap[id] = emptyStats();
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Active conversations count
      const activeRows = await this.db
        .select({
          operatorId: conversations.assigned_operator_id,
          count: count(),
        })
        .from(conversations)
        .where(
          and(
            eq(conversations.company_id, companyId),
            sql`${conversations.assigned_operator_id} = ANY(${operatorIds})`,
            or(
              eq(conversations.status, 'open'),
              eq(conversations.status, 'pending'),
            ),
          ),
        )
        .groupBy(conversations.assigned_operator_id);

      // Resolved today count
      const resolvedRows = await this.db
        .select({
          operatorId: conversations.assigned_operator_id,
          count: count(),
        })
        .from(conversations)
        .where(
          and(
            eq(conversations.company_id, companyId),
            sql`${conversations.assigned_operator_id} = ANY(${operatorIds})`,
            eq(conversations.status, 'resolved'),
            sql`${conversations.resolved_at} >= ${today}`,
          ),
        )
        .groupBy(conversations.assigned_operator_id);

      // Average satisfaction
      const ratingRows = await this.db
        .select({
          operatorId: conversations.assigned_operator_id,
          avgRating: sql<number>`COALESCE(AVG(${conversations.satisfaction_rating}), 0)`,
        })
        .from(conversations)
        .where(
          and(
            eq(conversations.company_id, companyId),
            sql`${conversations.assigned_operator_id} = ANY(${operatorIds})`,
            sql`${conversations.satisfaction_rating} IS NOT NULL`,
          ),
        )
        .groupBy(conversations.assigned_operator_id);

      for (const row of activeRows) {
        if (row.operatorId && statsMap[row.operatorId]) {
          statsMap[row.operatorId].activeConversations = Number(row.count);
        }
      }
      for (const row of resolvedRows) {
        if (row.operatorId && statsMap[row.operatorId]) {
          statsMap[row.operatorId].resolvedToday = Number(row.count);
        }
      }
      for (const row of ratingRows) {
        if (row.operatorId && statsMap[row.operatorId]) {
          statsMap[row.operatorId].avgRating = Math.round(Number(row.avgRating) * 10) / 10;
        }
      }
    } catch {
      // Conversations table schema may not have assigned_operator_id yet;
      // return zeroed stats gracefully instead of crashing the operators list.
    }

    return statsMap;
  }
}
