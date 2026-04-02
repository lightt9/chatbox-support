import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DATABASE } from '../../config/database.module';
import {
  companies,
  companySchedules,
  companyChannels,
} from '../../database/schema';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpsertChannelDto } from './dto/upsert-channel.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class CompanyService {
  constructor(@Inject(DATABASE) private readonly db: any) {}

  async findAll() {
    return this.db.query.companies.findMany({
      with: { schedules: true, channels: true },
    });
  }

  async findOne(id: string) {
    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, id),
      with: { schedules: true, channels: true },
    });

    if (!company) {
      throw new NotFoundException(`Company with id "${id}" not found`);
    }

    return company;
  }

  async create(dto: CreateCompanyDto) {
    const [created] = await this.db
      .insert(companies)
      .values({
        name: dto.name,
        slug: dto.slug,
        logo_url: dto.logoUrl,
        website: dto.website,
        default_language: dto.defaultLanguage,
        timezone: dto.timezone,
        plan: dto.plan,
        max_operators: dto.maxOperators,
      })
      .returning();

    return created;
  }

  async update(id: string, dto: UpdateCompanyDto) {
    const updateData: Record<string, any> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.logoUrl !== undefined) updateData.logo_url = dto.logoUrl;
    if (dto.website !== undefined) updateData.website = dto.website;
    if (dto.defaultLanguage !== undefined)
      updateData.default_language = dto.defaultLanguage;
    if (dto.timezone !== undefined) updateData.timezone = dto.timezone;
    if (dto.plan !== undefined) updateData.plan = dto.plan;
    if (dto.maxOperators !== undefined)
      updateData.max_operators = dto.maxOperators;

    updateData.updated_at = new Date();

    const [updated] = await this.db
      .update(companies)
      .set(updateData)
      .where(eq(companies.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Company with id "${id}" not found`);
    }

    return updated;
  }

  async remove(id: string) {
    const [deleted] = await this.db
      .delete(companies)
      .where(eq(companies.id, id))
      .returning();

    if (!deleted) {
      throw new NotFoundException(`Company with id "${id}" not found`);
    }

    return deleted;
  }

  async getSchedules(companyId: string) {
    await this.findOne(companyId);

    return this.db
      .select()
      .from(companySchedules)
      .where(eq(companySchedules.company_id, companyId));
  }

  async upsertSchedules(companyId: string, schedules: CreateScheduleDto[]) {
    await this.findOne(companyId);

    await this.db.transaction(async (tx: any) => {
      await tx
        .delete(companySchedules)
        .where(eq(companySchedules.company_id, companyId));

      if (schedules.length > 0) {
        await tx.insert(companySchedules).values(
          schedules.map((s) => ({
            company_id: companyId,
            day_of_week: s.dayOfWeek,
            open_time: s.openTime,
            close_time: s.closeTime,
            is_closed: s.isClosed ?? false,
          })),
        );
      }
    });

    return this.getSchedules(companyId);
  }

  async getChannels(companyId: string) {
    await this.findOne(companyId);

    return this.db
      .select()
      .from(companyChannels)
      .where(eq(companyChannels.company_id, companyId));
  }

  async upsertChannel(companyId: string, dto: UpsertChannelDto) {
    await this.findOne(companyId);

    const existing = await this.db
      .select()
      .from(companyChannels)
      .where(
        and(
          eq(companyChannels.company_id, companyId),
          eq(companyChannels.channel_type, dto.channelType),
        ),
      );

    if (existing.length > 0) {
      const updateData: Record<string, any> = {
        updated_at: new Date(),
      };

      if (dto.enabled !== undefined) updateData.enabled = dto.enabled;
      if (dto.credentials !== undefined)
        updateData.credentials = dto.credentials;
      if (dto.settings !== undefined) updateData.settings = dto.settings;

      const [updated] = await this.db
        .update(companyChannels)
        .set(updateData)
        .where(
          and(
            eq(companyChannels.company_id, companyId),
            eq(companyChannels.channel_type, dto.channelType),
          ),
        )
        .returning();

      return updated;
    }

    const [created] = await this.db
      .insert(companyChannels)
      .values({
        company_id: companyId,
        channel_type: dto.channelType,
        enabled: dto.enabled ?? true,
        credentials: dto.credentials ?? {},
        settings: dto.settings ?? {},
      })
      .returning();

    return created;
  }

  async getSettings(companyId: string) {
    const company = await this.findOne(companyId);
    return company.settings;
  }

  async updateSettings(companyId: string, dto: UpdateSettingsDto) {
    const [updated] = await this.db
      .update(companies)
      .set({
        settings: dto.settings,
        updated_at: new Date(),
      })
      .where(eq(companies.id, companyId))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Company with id "${companyId}" not found`);
    }

    return updated.settings;
  }
}
