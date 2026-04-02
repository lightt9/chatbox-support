import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('api/v1/chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  /**
   * Public chat endpoint for the widget.
   * Requires X-Company-Id header to identify the tenant.
   */
  @Post()
  async sendMessage(
    @Body() dto: SendMessageDto,
    @Headers('x-company-id') companyId?: string,
  ) {
    if (!companyId) {
      throw new BadRequestException('X-Company-Id header is required');
    }

    this.logger.log(
      `Chat message from ${dto.customerName ?? 'anonymous'} in company ${companyId}`,
    );

    const result = await this.chatService.handleMessage(
      companyId,
      dto.message,
      dto.conversationId,
      dto.customerName,
      dto.customerEmail,
    );

    return {
      conversationId: result.conversationId,
      reply: result.reply,
      model: result.model,
      responseTimeMs: result.responseTimeMs,
    };
  }
}
