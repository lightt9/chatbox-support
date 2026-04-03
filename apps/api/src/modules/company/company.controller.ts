import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Inject,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpsertChannelDto } from './dto/upsert-channel.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { DB_POOL } from '../../config/database.module';
import { AuthService } from '../admin/auth/auth.service';

@Controller('api/v1/companies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly authService: AuthService,
    @Inject(DB_POOL) private readonly pool: any,
  ) {}

  @Get()
  @Roles('super_admin')
  async findAll() {
    return this.companyService.findAll();
  }

  @Post()
  @Roles('super_admin')
  async create(@Body() dto: CreateCompanyDto) {
    return this.companyService.create(dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.companyService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companyService.update(id, dto);
  }

  @Delete(':id')
  @Roles('super_admin')
  async remove(@Param('id') id: string) {
    return this.companyService.remove(id);
  }

  @Get(':id/schedules')
  async getSchedules(@Param('id') id: string) {
    return this.companyService.getSchedules(id);
  }

  @Put(':id/schedules')
  async upsertSchedules(
    @Param('id') id: string,
    @Body() schedules: CreateScheduleDto[],
  ) {
    return this.companyService.upsertSchedules(id, schedules);
  }

  @Get(':id/channels')
  async getChannels(@Param('id') id: string) {
    return this.companyService.getChannels(id);
  }

  @Put(':id/channels')
  async upsertChannel(@Param('id') id: string, @Body() dto: UpsertChannelDto) {
    return this.companyService.upsertChannel(id, dto);
  }

  @Get(':id/settings')
  async getSettings(@Param('id') id: string) {
    return this.companyService.getSettings(id);
  }

  @Patch(':id/settings')
  async updateSettings(
    @Param('id') id: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.companyService.updateSettings(id, dto);
  }

  // ── Server Admin: Company Stats ─────────────────────────────────────────

  @Get(':id/stats')
  @Roles('super_admin')
  async getCompanyStats(@Param('id') id: string) {
    const { rows } = await this.pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM user_company_roles WHERE company_id = $1 AND active = true) AS user_count,
        (SELECT COUNT(*)::int FROM conversations WHERE company_id = $1) AS conversation_count,
        (SELECT COUNT(*)::int FROM conversations WHERE company_id = $1 AND status = 'open') AS active_conversations,
        (SELECT COUNT(*)::int FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.company_id = $1) AS message_count
    `, [id]);
    return rows[0] ?? { user_count: 0, conversation_count: 0, active_conversations: 0, message_count: 0 };
  }

  // ── Server Admin: Company Users ─────────────────────────────────────────

  @Get(':id/users')
  @Roles('super_admin')
  async getCompanyUsers(@Param('id') id: string) {
    const { rows } = await this.pool.query(`
      SELECT u.id, u.email, u.name, u.avatar_url, u.active, u.last_login_at, u.created_at,
             ucr.role
      FROM user_company_roles ucr
      JOIN admin_users u ON u.id = ucr.user_id
      WHERE ucr.company_id = $1
      ORDER BY ucr.role, u.name
    `, [id]);
    return rows.map((r: any) => ({
      id: r.id, email: r.email, name: r.name, avatarUrl: r.avatar_url,
      active: r.active, role: r.role, lastLoginAt: r.last_login_at, createdAt: r.created_at,
    }));
  }

  @Post(':id/users')
  @Roles('super_admin')
  async addCompanyUser(
    @Param('id') companyId: string,
    @Body() body: { email: string; name: string; role: string; password?: string },
  ) {
    const bcrypt = await import('bcrypt');
    const crypto = await import('crypto');

    // Check if user already exists
    const { rows: existing } = await this.pool.query(
      'SELECT id FROM admin_users WHERE email = $1', [body.email],
    );

    let userId: string;
    let generatedPassword: string | null = null;

    if (existing.length > 0) {
      userId = existing[0].id;
    } else {
      // Auto-generate password if none provided
      const password = body.password || crypto.randomBytes(8).toString('hex');
      if (!body.password) generatedPassword = password;
      const hash = await bcrypt.hash(password, 12);
      const { rows: created } = await this.pool.query(
        `INSERT INTO admin_users (company_id, email, name, password_hash, role, active)
         VALUES ($1, $2, $3, $4, $5, true) RETURNING id`,
        [companyId, body.email, body.name, hash, body.role],
      );
      userId = created[0].id;
    }

    // Add/update role in user_company_roles
    await this.pool.query(
      `INSERT INTO user_company_roles (user_id, company_id, role, active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (user_id, company_id) DO UPDATE SET role = $3, active = true, updated_at = NOW()`,
      [userId, companyId, body.role],
    );

    return { success: true, userId, generatedPassword };
  }

  @Patch(':id/users/:userId/role')
  @Roles('super_admin')
  async updateUserRole(
    @Param('id') companyId: string,
    @Param('userId') userId: string,
    @Body() body: { role: string },
  ) {
    await this.pool.query(
      `UPDATE user_company_roles SET role = $3, updated_at = NOW()
       WHERE user_id = $1 AND company_id = $2`,
      [userId, companyId, body.role],
    );
    // Also update the admin_users table for backward compatibility
    await this.pool.query(
      `UPDATE admin_users SET role = $2, updated_at = NOW() WHERE id = $1`,
      [userId, body.role],
    );
    return { success: true };
  }

  @Delete(':id/users/:userId')
  @Roles('super_admin')
  async removeCompanyUser(
    @Param('id') companyId: string,
    @Param('userId') userId: string,
  ) {
    // Deactivate the role, don't delete the user
    await this.pool.query(
      `UPDATE user_company_roles SET active = false, updated_at = NOW()
       WHERE user_id = $1 AND company_id = $2`,
      [userId, companyId],
    );
    return { success: true };
  }

  // ── Server Admin: Impersonation ─────────────────────────────────────────

  @Post(':id/impersonate')
  @Roles('super_admin')
  async impersonateCompany(
    @Param('id') companyId: string,
    @Request() req: any,
  ) {
    // Generate tokens as company_admin for this company
    return this.authService.switchCompany(req.user.id, companyId);
  }

  @Post(':id/users/:userId/impersonate')
  @Roles('super_admin')
  async impersonateUser(
    @Param('id') companyId: string,
    @Param('userId') userId: string,
  ) {
    // Get user's role in this company
    const { rows } = await this.pool.query(
      `SELECT u.id, u.email, u.name, u.company_id, ucr.role
       FROM user_company_roles ucr
       JOIN admin_users u ON u.id = ucr.user_id
       WHERE ucr.user_id = $1 AND ucr.company_id = $2 AND ucr.active = true`,
      [userId, companyId],
    );
    if (rows.length === 0) return { error: 'User not found in this company' };

    const user = rows[0];
    return this.authService.login({
      id: user.id, email: user.email, name: user.name,
      role: user.role, company_id: companyId, avatar_url: null,
    });
  }
}
