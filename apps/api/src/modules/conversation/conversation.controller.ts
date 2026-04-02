import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConversationService } from './conversation.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiService, ChatMessage } from '../ai/ai.service';
import { DB_POOL } from '../../config/database.module';
import { Inject } from '@nestjs/common';

@Controller('api/v1/conversations')
@UseGuards(AuthGuard('jwt'))
export class ConversationController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly aiService: AiService,
    @Inject(DB_POOL) private readonly pool: any,
  ) {}

  @Get()
  async findAll(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('name') agentName: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('assigned') assigned?: string,
    @Query('starred') starred?: string,
    @Query('priority') priority?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.conversationService.findAll(companyId, {
      status: status || undefined,
      search: search || undefined,
      assigned: assigned || undefined,
      agentName,
      starred: starred === 'true' ? true : undefined,
      priority: priority || undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('counts')
  async getCounts(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('name') agentName: string,
  ) {
    return this.conversationService.getStatusCounts(companyId, agentName);
  }

  @Get(':id')
  async findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    const conv = await this.conversationService.findOne(companyId, id);
    if (!conv) throw new NotFoundException('Conversation not found');
    return conv;
  }

  @Get(':id/messages')
  async getMessages(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.conversationService.getMessages(companyId, id);
  }

  @Post(':id/messages')
  async sendMessage(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('name') agentName: string,
    @Param('id') id: string,
    @Body() body: { message: string },
  ) {
    const msg = await this.conversationService.sendMessage(
      companyId, id, 'agent', agentName, body.message,
    );
    if (!msg) throw new NotFoundException('Conversation not found');
    return msg;
  }

  @Patch(':id/assign')
  async assign(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('name') agentName: string,
    @Param('id') id: string,
    @Body() body: { agentName?: string | null },
  ) {
    const agent = body.agentName === undefined ? agentName : body.agentName;
    const ok = await this.conversationService.assign(companyId, id, agent);
    if (!ok) throw new NotFoundException('Conversation not found');
    return { success: true, assignedAgent: agent };
  }

  @Patch(':id/resolve')
  async resolve(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('name') agentName: string,
    @Param('id') id: string,
  ) {
    const ok = await this.conversationService.resolve(companyId, id, agentName);
    if (!ok) throw new NotFoundException('Conversation not found');
    return { success: true };
  }

  @Post(':id/escalate')
  async escalate(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    const ok = await this.conversationService.escalate(companyId, id);
    if (!ok) throw new NotFoundException('Conversation not found');
    return { success: true };
  }

  @Patch(':id/reopen')
  async reopen(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    const ok = await this.conversationService.updateStatus(companyId, id, 'open');
    if (!ok) throw new NotFoundException('Conversation not found');
    return { success: true };
  }

  @Patch(':id/star')
  async toggleStar(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    const starred = await this.conversationService.toggleStar(companyId, id);
    if (starred === null) throw new NotFoundException('Conversation not found');
    return { success: true, starred };
  }

  @Patch(':id/priority')
  async setPriority(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: { priority: string },
  ) {
    const ok = await this.conversationService.setPriority(companyId, id, body.priority);
    if (!ok) throw new NotFoundException('Conversation not found');
    return { success: true };
  }

  @Patch(':id/tags')
  async updateTags(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: { tags: string[] },
  ) {
    const ok = await this.conversationService.updateTags(companyId, id, body.tags);
    if (!ok) throw new NotFoundException('Conversation not found');
    return { success: true };
  }

  @Patch(':id/notes')
  async updateNotes(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: { notes: string },
  ) {
    const ok = await this.conversationService.updateNotes(companyId, id, body.notes);
    if (!ok) throw new NotFoundException('Conversation not found');
    return { success: true };
  }

  // ── AI Suggestions ───────────────────────────────────────────────────

  @Get(':id/suggestions')
  async getSuggestions(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    const msgs = await this.conversationService.getMessages(companyId, id);
    if (msgs.length === 0) return { suggestions: [] };

    const lastFive = msgs.slice(-5);
    const chatMessages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'You are a support agent assistant. Based on the conversation, suggest exactly 3 brief reply options the agent could send. Return ONLY a JSON array of 3 strings, no explanation. Keep each under 100 characters.',
      },
      ...lastFive.map((m: any) => ({
        role: (m.senderType === 'customer' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.body,
      })),
    ];

    const aiRes = await this.aiService.chat(chatMessages, { temperature: 0.8, maxTokens: 256 });

    let suggestions: string[] = [];
    try {
      const parsed = JSON.parse(aiRes.content);
      if (Array.isArray(parsed)) suggestions = parsed.slice(0, 3);
    } catch {
      suggestions = aiRes.content
        .split('\n')
        .map((s: string) => s.replace(/^[\d.\-*]+\s*/, '').replace(/^["']|["']$/g, '').trim())
        .filter((s: string) => s.length > 5)
        .slice(0, 3);
    }

    return { suggestions };
  }

  // ── Saved Replies / Templates ────────────────────────────────────────

  @Get('templates/list')
  async getTemplates(@CurrentUser('companyId') companyId: string) {
    const { rows } = await this.pool.query(
      'SELECT id, title, content, category, shortcut FROM saved_replies WHERE company_id = $1 ORDER BY category, title',
      [companyId],
    );
    return rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      category: r.category,
      shortcut: r.shortcut,
    }));
  }

  @Post('templates')
  async createTemplate(
    @CurrentUser('companyId') companyId: string,
    @Body() body: { title: string; content: string; category?: string; shortcut?: string },
  ) {
    const { rows } = await this.pool.query(
      `INSERT INTO saved_replies (company_id, title, content, category, shortcut)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, title, content, category, shortcut`,
      [companyId, body.title, body.content, body.category ?? 'general', body.shortcut ?? null],
    );
    return rows[0];
  }

  @Delete('templates/:templateId')
  async deleteTemplate(
    @CurrentUser('companyId') companyId: string,
    @Param('templateId') templateId: string,
  ) {
    await this.pool.query(
      'DELETE FROM saved_replies WHERE id = $1 AND company_id = $2',
      [templateId, companyId],
    );
    return { success: true };
  }
}
