import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB_POOL } from '../../config/database.module';
import { AiService, ChatMessage } from '../ai/ai.service';

interface ChatResponse {
  conversationId: string;
  reply: string;
  model: string;
  tokensUsed: { prompt: number; completion: number; total: number };
  responseTimeMs: number;
}

const MAX_HISTORY_MESSAGES = 20;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(DB_POOL) private readonly pool: any,
    private readonly aiService: AiService,
  ) {}

  async handleMessage(
    companyId: string,
    message: string,
    conversationId?: string,
    customerName?: string,
    customerEmail?: string,
  ): Promise<ChatResponse> {
    // 1. Create or fetch conversation
    const convId = conversationId
      ? await this.verifyConversation(companyId, conversationId)
      : await this.createConversation(companyId, customerName, customerEmail);

    // 2. Save user message
    await this.saveMessage(convId, 'customer', customerName ?? 'Customer', message);

    // 3. Load conversation history for context
    const history = await this.getHistory(convId);

    // 4. Build messages array with system prompt
    const messages: ChatMessage[] = [
      { role: 'system', content: this.aiService.systemPrompt },
      ...history,
    ];

    // 5. Call AI
    const aiResponse = await this.aiService.chat(messages);

    // 6. Save AI response
    await this.saveMessage(convId, 'ai', 'AI Assistant', aiResponse.content);

    // 7. Update conversation timestamp
    await this.pool.query(
      'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
      [convId],
    );

    // 8. Set first_response_at if this is the first reply
    await this.pool.query(
      `UPDATE conversations SET first_response_at = NOW()
       WHERE id = $1 AND first_response_at IS NULL`,
      [convId],
    );

    return {
      conversationId: convId,
      reply: aiResponse.content,
      model: aiResponse.model,
      tokensUsed: aiResponse.tokensUsed,
      responseTimeMs: aiResponse.responseTimeMs,
    };
  }

  private async createConversation(
    companyId: string,
    customerName?: string,
    customerEmail?: string,
  ): Promise<string> {
    const { rows } = await this.pool.query(
      `INSERT INTO conversations (
        company_id, customer_name, customer_email, channel, status, subject
      ) VALUES ($1, $2, $3, 'web_chat', 'open', 'Chat conversation')
      RETURNING id`,
      [companyId, customerName ?? 'Visitor', customerEmail ?? null],
    );
    return rows[0].id;
  }

  private async verifyConversation(
    companyId: string,
    conversationId: string,
  ): Promise<string> {
    const { rows } = await this.pool.query(
      'SELECT id FROM conversations WHERE id = $1 AND company_id = $2',
      [conversationId, companyId],
    );

    if (rows.length === 0) {
      this.logger.warn(`Conversation ${conversationId} not found for company ${companyId}`);
      return this.createConversation(companyId);
    }

    return rows[0].id;
  }

  private async saveMessage(
    conversationId: string,
    senderType: string,
    senderName: string,
    body: string,
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO messages (conversation_id, sender_type, sender_name, body)
       VALUES ($1, $2, $3, $4)`,
      [conversationId, senderType, senderName, body],
    );
  }

  private async getHistory(conversationId: string): Promise<ChatMessage[]> {
    const { rows } = await this.pool.query(
      `SELECT sender_type, body
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [conversationId, MAX_HISTORY_MESSAGES],
    );

    return rows.map((r: any) => ({
      role: r.sender_type === 'customer' ? 'user' as const : 'assistant' as const,
      content: r.body,
    }));
  }
}
