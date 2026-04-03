import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB_POOL } from '../../config/database.module';
import { AiService, ChatMessage } from '../ai/ai.service';
import { ChatGateway } from './chat.gateway';

interface ChatResponse {
  conversationId: string;
  reply: string;
  model: string;
  tokensUsed: { prompt: number; completion: number; total: number };
  responseTimeMs: number;
  escalated: boolean;
}

interface VisitorData {
  ip?: string;
  country?: string;
  city?: string;
  device?: string;
  browser?: string;
  os?: string;
  userAgent?: string;
}

const MAX_HISTORY_MESSAGES = 20;

const ESCALATION_KEYWORDS = [
  'human', 'agent', 'real person', 'speak to someone', 'talk to someone',
  'representative', 'manager', 'supervisor', 'operator', 'help me please',
  'this is not helping', 'not helpful', 'transfer', 'connect me',
];

const ESCALATION_SYSTEM_ADDENDUM = `
IMPORTANT: If the user explicitly asks to speak with a human agent, or if you are unable to resolve their issue, respond with EXACTLY the prefix "[ESCALATE]" followed by your message. Example: "[ESCALATE] I'll connect you with a human agent right away."
Also respond with "[ESCALATE]" if the user seems frustrated or the question is about billing, refunds, account deletion, or legal matters.`;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(DB_POOL) private readonly pool: any,
    private readonly aiService: AiService,
    private readonly gateway: ChatGateway,
  ) {}

  async handleMessage(
    companyId: string,
    message: string,
    conversationId?: string,
    customerName?: string,
    customerEmail?: string,
    customerPhone?: string,
    visitorData?: VisitorData,
  ): Promise<ChatResponse> {
    // 1. Check if conversation exists and is handled by a human
    if (conversationId) {
      const isHumanHandled = await this.isHumanHandled(conversationId);
      if (isHumanHandled) {
        // Just save the message; don't trigger AI
        const msg = await this.saveMessage(
          conversationId,
          'customer',
          customerName ?? 'Customer',
          message,
        );

        this.gateway.emitNewMessage(companyId, conversationId, msg);
        await this.touchConversation(conversationId);

        return {
          conversationId,
          reply: '',
          model: 'human-handled',
          tokensUsed: { prompt: 0, completion: 0, total: 0 },
          responseTimeMs: 0,
          escalated: false,
        };
      }
    }

    // 2. Create or fetch conversation
    const convId = conversationId
      ? await this.verifyConversation(companyId, conversationId)
      : await this.createConversation(
          companyId,
          customerName,
          customerEmail,
          customerPhone,
          visitorData,
        );

    // 3. Save user message
    const customerMsg = await this.saveMessage(
      convId,
      'customer',
      customerName ?? 'Customer',
      message,
    );
    this.gateway.emitNewMessage(companyId, convId, customerMsg);

    // 4. Check for keyword-based escalation
    const keywordEscalation = this.detectEscalationKeywords(message);

    // 5. Load conversation history for context
    const history = await this.getHistory(convId);

    // 6. Build messages array with escalation-aware system prompt
    const systemPrompt = (await this.aiService.getCompanyPrompt(companyId)) + ESCALATION_SYSTEM_ADDENDUM;
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
    ];

    // 7. Call AI
    const aiResponse = await this.aiService.chat(messages);

    // 8. Detect escalation from AI response or keywords
    const aiEscalation = aiResponse.content.startsWith('[ESCALATE]');
    const shouldEscalate = keywordEscalation || aiEscalation;

    const cleanReply = aiEscalation
      ? aiResponse.content.replace('[ESCALATE]', '').trim()
      : aiResponse.content;

    const finalReply = shouldEscalate && !aiEscalation
      ? "I understand you'd like to speak with a human agent. Let me connect you with one right away. A team member will join this chat shortly."
      : cleanReply;

    // 9. Save AI response
    const aiMsg = await this.saveMessage(convId, 'ai', 'AI Assistant', finalReply);
    this.gateway.emitNewMessage(companyId, convId, aiMsg);

    // 10. Update conversation
    await this.touchConversation(convId);
    await this.setFirstResponseIfNeeded(convId);

    // 11. Handle escalation
    if (shouldEscalate) {
      await this.escalateConversation(companyId, convId);
    }

    return {
      conversationId: convId,
      reply: finalReply,
      model: aiResponse.model,
      tokensUsed: aiResponse.tokensUsed,
      responseTimeMs: aiResponse.responseTimeMs,
      escalated: shouldEscalate,
    };
  }

  async resolvePublicKey(publicKey: string) {
    const { rows } = await this.pool.query(
      `SELECT id, name, public_key, settings FROM companies WHERE public_key = $1 AND active = true LIMIT 1`,
      [publicKey],
    );
    if (rows.length === 0) return { error: 'Invalid key' };
    const company = rows[0];
    const settings = company.settings ?? {};
    const widget = settings.widget ?? {};
    return {
      companyId: company.id,
      companyName: company.name,
      config: {
        companyName: widget.companyName ?? company.name,
        welcomeMessage: widget.welcomeMessage ?? 'Hi! How can we help?',
        botAvatarUrl: widget.botAvatarUrl ?? '',
        headerColor: widget.headerColor ?? '#3b82f6',
        userMessageColor: widget.userMessageColor ?? '#3b82f6',
        botMessageColor: widget.botMessageColor ?? '#f1f5f9',
        chatBackground: widget.chatBackground ?? '#ffffff',
        widgetPosition: widget.widgetPosition ?? 'right',
        widgetSize: widget.widgetSize ?? 'medium',
        borderRadius: widget.borderRadius ?? 16,
        soundEnabled: widget.soundEnabled ?? true,
        featureEmoji: widget.featureEmoji ?? true,
        featureFileUpload: widget.featureFileUpload ?? true,
        featureChatHistory: widget.featureChatHistory ?? true,
        featureEndChat: widget.featureEndChat ?? true,
        featureSeenStatus: widget.featureSeenStatus ?? true,
        featureLiveTyping: widget.featureLiveTyping ?? true,
        featureSound: widget.featureSound ?? true,
      },
    };
  }

  async getConversationMessages(conversationId: string) {
    const { rows } = await this.pool.query(
      `SELECT id, conversation_id, sender_type, sender_name, body, attachment_url, attachment_name, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId],
    );
    return rows.map((r: any) => ({
      id: r.id,
      conversationId: r.conversation_id,
      senderType: r.sender_type,
      senderName: r.sender_name,
      body: r.body,
      attachmentUrl: r.attachment_url ?? null,
      attachmentName: r.attachment_name ?? null,
      createdAt: r.created_at,
    }));
  }

  async saveAttachmentMessage(
    conversationId: string,
    senderType: string,
    senderName: string,
    body: string,
    attachmentUrl: string,
    attachmentName: string,
  ) {
    const { rows } = await this.pool.query(
      `INSERT INTO messages (conversation_id, sender_type, sender_name, body, attachment_url, attachment_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, conversation_id, sender_type, sender_name, body, attachment_url, attachment_name, created_at`,
      [conversationId, senderType, senderName, body, attachmentUrl, attachmentName],
    );
    const r = rows[0];
    const msg = {
      id: r.id,
      conversationId: r.conversation_id,
      senderType: r.sender_type,
      senderName: r.sender_name,
      body: r.body,
      attachmentUrl: r.attachment_url,
      attachmentName: r.attachment_name,
      createdAt: r.created_at,
    };

    // Get company ID to emit via WebSocket
    const conv = await this.getConversationInfo(conversationId);
    if (conv) {
      this.gateway.emitNewMessage(conv.companyId, conversationId, msg as any);
    }

    await this.touchConversation(conversationId);
    return msg;
  }

  async getConversationInfo(conversationId: string) {
    const { rows } = await this.pool.query(
      `SELECT id, company_id, customer_name, customer_email, customer_phone,
              channel, status, assigned_agent, metadata, created_at, updated_at
       FROM conversations WHERE id = $1`,
      [conversationId],
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      companyId: r.company_id,
      customerName: r.customer_name,
      customerEmail: r.customer_email,
      customerPhone: r.customer_phone,
      channel: r.channel,
      status: r.status,
      assignedAgent: r.assigned_agent,
      metadata: r.metadata,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  private detectEscalationKeywords(message: string): boolean {
    const lower = message.toLowerCase();
    return ESCALATION_KEYWORDS.some((kw) => lower.includes(kw));
  }

  private async isHumanHandled(conversationId: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT assigned_agent, status FROM conversations WHERE id = $1`,
      [conversationId],
    );
    if (rows.length === 0) return false;
    return rows[0].assigned_agent !== null && rows[0].status !== 'resolved';
  }

  private async createConversation(
    companyId: string,
    customerName?: string,
    customerEmail?: string,
    customerPhone?: string,
    visitorData?: VisitorData,
  ): Promise<string> {
    const metadata = visitorData ? JSON.stringify(visitorData) : '{}';
    const { rows } = await this.pool.query(
      `INSERT INTO conversations (
        company_id, customer_name, customer_email, customer_phone,
        channel, status, subject, metadata
      ) VALUES ($1, $2, $3, $4, 'web_chat', 'open', 'Chat conversation', $5)
      RETURNING id`,
      [
        companyId,
        customerName ?? 'Visitor',
        customerEmail ?? null,
        customerPhone ?? null,
        metadata,
      ],
    );

    const convId = rows[0].id;

    // Emit new conversation to dashboard
    this.gateway.emitConversationUpdate(companyId, convId, {
      event: 'created',
      customerName: customerName ?? 'Visitor',
      customerEmail,
      channel: 'web_chat',
      status: 'open',
    });

    return convId;
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
      this.logger.warn(
        `Conversation ${conversationId} not found for company ${companyId}`,
      );
      return this.createConversation(companyId);
    }

    return rows[0].id;
  }

  private async saveMessage(
    conversationId: string,
    senderType: string,
    senderName: string,
    body: string,
  ) {
    const { rows } = await this.pool.query(
      `INSERT INTO messages (conversation_id, sender_type, sender_name, body)
       VALUES ($1, $2, $3, $4)
       RETURNING id, conversation_id, sender_type, sender_name, body, attachment_url, attachment_name, created_at`,
      [conversationId, senderType, senderName, body],
    );
    const r = rows[0];
    return {
      id: r.id,
      conversationId: r.conversation_id,
      senderType: r.sender_type,
      senderName: r.sender_name,
      body: r.body,
      attachmentUrl: r.attachment_url ?? null,
      attachmentName: r.attachment_name ?? null,
      createdAt: r.created_at,
    };
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
      role:
        r.sender_type === 'customer'
          ? ('user' as const)
          : ('assistant' as const),
      content: r.body,
    }));
  }

  private async touchConversation(conversationId: string) {
    await this.pool.query(
      'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
      [conversationId],
    );
  }

  private async setFirstResponseIfNeeded(conversationId: string) {
    await this.pool.query(
      `UPDATE conversations SET first_response_at = NOW()
       WHERE id = $1 AND first_response_at IS NULL`,
      [conversationId],
    );
  }

  private async escalateConversation(companyId: string, conversationId: string) {
    await this.pool.query(
      `UPDATE conversations SET status = 'escalated', updated_at = NOW()
       WHERE id = $1`,
      [conversationId],
    );

    this.gateway.emitConversationUpdate(companyId, conversationId, {
      event: 'escalated',
      status: 'escalated',
    });

    this.logger.log(`Conversation ${conversationId} escalated to human agent`);
  }

  async closeConversation(companyId: string, conversationId: string) {
    await this.pool.query(
      `UPDATE conversations SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [conversationId],
    );

    this.gateway.emitConversationUpdate(companyId, conversationId, {
      event: 'resolved',
      status: 'resolved',
    });
  }

  async rateConversation(conversationId: string, rating: number, comment?: string) {
    await this.pool.query(
      `UPDATE conversations SET
        metadata = jsonb_set(
          COALESCE(metadata, '{}'),
          '{rating}',
          $2::jsonb
        ),
        updated_at = NOW()
       WHERE id = $1`,
      [conversationId, JSON.stringify({ score: rating, comment: comment ?? null, ratedAt: new Date().toISOString() })],
    );
  }

  async getCustomerConversations(companyId: string, email: string) {
    const { rows } = await this.pool.query(
      `SELECT id, customer_name, status, subject, created_at, updated_at,
              (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
              (SELECT COUNT(*)::int FROM messages WHERE conversation_id = c.id) AS message_count
       FROM conversations c
       WHERE c.company_id = $1 AND c.customer_email = $2
       ORDER BY c.updated_at DESC
       LIMIT 20`,
      [companyId, email],
    );

    return rows.map((r: any) => ({
      id: r.id,
      customerName: r.customer_name,
      status: r.status,
      subject: r.subject,
      lastMessage: r.last_message,
      messageCount: r.message_count,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }
}
