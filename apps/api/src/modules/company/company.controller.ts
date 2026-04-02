import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
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

@Controller('api/v1/companies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

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
}
