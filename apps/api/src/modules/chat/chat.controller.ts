import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Headers,
  Req,
  BadRequestException,
  NotFoundException,
  Logger,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Request } from 'express';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { SettingsService } from '../settings/settings.service';

const uploadStorage = diskStorage({
  destination: join(process.cwd(), 'uploads'),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

@Controller('api/v1/chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Public: Get widget configuration for a company (by header).
   */
  @Get('widget-config')
  async getWidgetConfig(
    @Headers('x-company-id') companyId: string | undefined,
  ) {
    if (!companyId) {
      throw new BadRequestException('X-Company-Id header is required');
    }
    return this.settingsService.getPublicWidgetConfig(companyId);
  }

  /**
   * Public: Resolve a public key to company config.
   * Used by the embeddable script to initialize the widget.
   */
  @Get('init/:publicKey')
  async initByPublicKey(@Param('publicKey') publicKey: string) {
    return this.chatService.resolvePublicKey(publicKey);
  }

  /**
   * Public chat endpoint for the widget.
   * Requires X-Company-Id header to identify the tenant.
   */
  @Post()
  async sendMessage(
    @Body() dto: SendMessageDto,
    @Headers('x-company-id') companyId: string | undefined,
    @Req() req: Request,
  ) {
    if (!companyId) {
      throw new BadRequestException('X-Company-Id header is required');
    }

    // Extract IP from request
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '';

    const visitorData = {
      ...dto.visitorData,
      ip,
    };

    this.logger.log(
      `Chat message from ${dto.customerName ?? 'anonymous'} in company ${companyId}`,
    );

    const result = await this.chatService.handleMessage(
      companyId,
      dto.message,
      dto.conversationId,
      dto.customerName,
      dto.customerEmail,
      dto.customerPhone,
      visitorData,
    );

    return {
      conversationId: result.conversationId,
      reply: result.reply,
      model: result.model,
      responseTimeMs: result.responseTimeMs,
      escalated: result.escalated,
    };
  }

  /**
   * Get conversation history (public, for widget).
   */
  @Get(':id/messages')
  async getMessages(
    @Param('id') id: string,
    @Headers('x-company-id') companyId: string | undefined,
  ) {
    if (!companyId) {
      throw new BadRequestException('X-Company-Id header is required');
    }

    const info = await this.chatService.getConversationInfo(id);
    if (!info || info.companyId !== companyId) {
      throw new NotFoundException('Conversation not found');
    }

    return this.chatService.getConversationMessages(id);
  }

  /**
   * Get conversation status/info (public, for widget).
   */
  @Get(':id/status')
  async getStatus(
    @Param('id') id: string,
    @Headers('x-company-id') companyId: string | undefined,
  ) {
    if (!companyId) {
      throw new BadRequestException('X-Company-Id header is required');
    }

    const info = await this.chatService.getConversationInfo(id);
    if (!info || info.companyId !== companyId) {
      throw new NotFoundException('Conversation not found');
    }

    return {
      id: info.id,
      status: info.status,
      assignedAgent: info.assignedAgent,
    };
  }

  /**
   * Close/resolve a conversation from the widget.
   */
  @Patch(':id/close')
  async closeConversation(
    @Param('id') id: string,
    @Headers('x-company-id') companyId: string | undefined,
  ) {
    if (!companyId) {
      throw new BadRequestException('X-Company-Id header is required');
    }

    const info = await this.chatService.getConversationInfo(id);
    if (!info || info.companyId !== companyId) {
      throw new NotFoundException('Conversation not found');
    }

    await this.chatService.closeConversation(companyId, id);
    return { success: true };
  }

  /**
   * Rate a conversation from the widget.
   */
  @Post(':id/rate')
  async rateConversation(
    @Param('id') id: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Body() body: { rating: number; comment?: string },
  ) {
    if (!companyId) {
      throw new BadRequestException('X-Company-Id header is required');
    }

    if (!body.rating || body.rating < 1 || body.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const info = await this.chatService.getConversationInfo(id);
    if (!info || info.companyId !== companyId) {
      throw new NotFoundException('Conversation not found');
    }

    await this.chatService.rateConversation(id, body.rating, body.comment);
    return { success: true };
  }

  /**
   * Get conversation list for a customer email (for history).
   */
  @Get('history/:email')
  async getHistory(
    @Param('email') email: string,
    @Headers('x-company-id') companyId: string | undefined,
  ) {
    if (!companyId) {
      throw new BadRequestException('X-Company-Id header is required');
    }

    return this.chatService.getCustomerConversations(companyId, email);
  }

  /**
   * Upload a file attachment in a chat conversation.
   */
  @Post(':id/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: uploadStorage,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|gif|webp|pdf|doc|docx|xls|xlsx|txt|csv|zip)$/i;
        if (allowed.test(extname(file.originalname))) {
          cb(null, true);
        } else {
          cb(new BadRequestException('File type not allowed'), false);
        }
      },
    }),
  )
  async uploadFile(
    @Param('id') id: string,
    @Headers('x-company-id') companyId: string | undefined,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { customerName?: string; message?: string },
  ) {
    if (!companyId) {
      throw new BadRequestException('X-Company-Id header is required');
    }
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const info = await this.chatService.getConversationInfo(id);
    if (!info || info.companyId !== companyId) {
      throw new NotFoundException('Conversation not found');
    }

    const attachmentUrl = `/uploads/${file.filename}`;
    const msg = await this.chatService.saveAttachmentMessage(
      id,
      'customer',
      body.customerName ?? 'Customer',
      body.message ?? '',
      attachmentUrl,
      file.originalname,
    );

    return msg;
  }
}
