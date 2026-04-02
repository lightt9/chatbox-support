import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { CreateChatLeadDto } from './dto/create-chat-lead.dto';
import { SyncMessageDto } from './dto/sync-message.dto';

@Controller('api/v1/leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  /* ── Public endpoints (called by widget, no JWT) ──────────────────────── */

  @Post('from-chat')
  createFromChat(@Body() dto: CreateChatLeadDto, @Query('companyId') companyId: string) {
    return this.leadsService.createFromChat(companyId, dto);
  }

  @Post('sync-message')
  syncMessage(@Body() dto: SyncMessageDto) {
    return this.leadsService.syncFromMessage(dto.conversationId, dto.message, dto.senderType);
  }

  /* ── Protected endpoints (admin dashboard) ────────────────────────────── */

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser() u: any, @Query('search') search?: string, @Query('status') status?: string, @Query('rating') rating?: string) {
    return this.leadsService.findAll(u.companyId, { search, status, rating });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@CurrentUser() u: any, @Param('id') id: string) {
    return this.leadsService.findOne(u.companyId, id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() u: any, @Body() dto: CreateLeadDto) {
    return this.leadsService.create(u.companyId, u.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(u.companyId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() u: any, @Param('id') id: string) {
    return this.leadsService.remove(u.companyId, id);
  }
}
