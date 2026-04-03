import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DB_POOL } from '../../config/database.module';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiResponse {
  content: string;
  model: string;
  tokensUsed: { prompt: number; completion: number; total: number };
  responseTimeMs: number;
}

const DEFAULT_SYSTEM_PROMPT = `You are a friendly and helpful customer support assistant for ChatBox.
Your role is to:
- Answer customer questions clearly and concisely
- Help resolve issues quickly
- Be polite and professional at all times
- If you cannot resolve an issue, let the customer know a human agent will assist them
- Collect relevant information (name, email) when appropriate for lead capture
- Keep responses concise — under 3 sentences when possible

Do not make up information. If you don't know something, say so honestly.`;

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1000;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const TONE_PROMPTS: Record<string, string> = {
  friendly: 'Be warm, approachable, and conversational. Use casual language and emojis occasionally.',
  professional: 'Be polite, formal, and precise. Use clear, structured language.',
  sales: 'Be enthusiastic and persuasive. Highlight value propositions. Guide toward conversion.',
  support: 'Be empathetic and solution-focused. Acknowledge frustration. Provide step-by-step help.',
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string;
  private readonly model: string;

  constructor(
    private readonly config: ConfigService,
    @Inject(DB_POOL) private readonly pool: any,
  ) {
    this.apiKey = this.config.get<string>('GROK_API_KEY', '');
    this.model = this.config.get<string>('GROK_MODEL', 'llama-3.3-70b-versatile');

    if (!this.apiKey) {
      this.logger.warn('GROK_API_KEY is not set — AI responses will use fallback');
    }
  }

  get systemPrompt(): string {
    return DEFAULT_SYSTEM_PROMPT;
  }

  /** Build a company-specific system prompt with tone + custom instructions */
  async getCompanyPrompt(companyId: string): Promise<string> {
    try {
      const { rows } = await this.pool.query(
        `SELECT name, settings FROM companies WHERE id = $1`,
        [companyId],
      );
      if (rows.length === 0) return DEFAULT_SYSTEM_PROMPT;

      const company = rows[0];
      const settings = company.settings ?? {};
      const aiSettings = settings.ai ?? {};

      const companyName = company.name ?? 'our company';
      const tone = aiSettings.tone ?? 'friendly';
      const customInstructions = aiSettings.customPrompt ?? '';
      const knowledgeContext = aiSettings.knowledgeContext ?? '';

      let prompt = `You are a ${tone} customer support assistant for ${companyName}.\n`;
      prompt += TONE_PROMPTS[tone] ?? TONE_PROMPTS.friendly;
      prompt += '\n\nYour role is to:\n';
      prompt += '- Answer customer questions clearly and concisely\n';
      prompt += '- Help resolve issues quickly\n';
      prompt += '- If you cannot resolve an issue, let the customer know a human agent will assist them\n';
      prompt += '- Keep responses concise — under 3 sentences when possible\n';
      prompt += '- Do not make up information. If you don\'t know something, say so honestly.\n';

      if (knowledgeContext) {
        prompt += `\n--- Company Knowledge ---\n${knowledgeContext}\n--- End Knowledge ---\n`;
      }

      if (customInstructions) {
        prompt += `\n--- Custom Instructions ---\n${customInstructions}\n`;
      }

      return prompt;
    } catch (err) {
      this.logger.error('Failed to load company AI settings', err);
      return DEFAULT_SYSTEM_PROMPT;
    }
  }

  async chat(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<AiResponse> {
    if (!this.apiKey) {
      return this.fallbackResponse();
    }

    const startTime = Date.now();

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages,
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens ?? 512,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          this.logger.error(
            `Groq API error (attempt ${attempt + 1}): ${response.status} — ${errorBody}`,
          );

          // Retry on 429 (rate limit) or 5xx
          if (
            attempt < MAX_RETRIES &&
            (response.status === 429 || response.status >= 500)
          ) {
            const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
            await this.sleep(delay);
            continue;
          }

          return this.fallbackResponse(Date.now() - startTime);
        }

        const data = await response.json() as any;
        const choice = data.choices?.[0];
        const usage = data.usage ?? {};
        const responseTimeMs = Date.now() - startTime;

        const result: AiResponse = {
          content: choice?.message?.content?.trim() ?? 'I apologize, I could not generate a response.',
          model: data.model ?? this.model,
          tokensUsed: {
            prompt: usage.prompt_tokens ?? 0,
            completion: usage.completion_tokens ?? 0,
            total: usage.total_tokens ?? 0,
          },
          responseTimeMs,
        };

        this.logger.log(
          `AI response: model=${result.model} tokens=${result.tokensUsed.total} time=${responseTimeMs}ms`,
        );

        return result;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Groq API request failed (attempt ${attempt + 1}): ${message}`);

        if (attempt < MAX_RETRIES) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
          await this.sleep(delay);
          continue;
        }

        return this.fallbackResponse(Date.now() - startTime);
      }
    }

    return this.fallbackResponse(Date.now() - startTime);
  }

  private fallbackResponse(responseTimeMs = 0): AiResponse {
    return {
      content:
        'I apologize, but I\'m having trouble processing your request right now. ' +
        'A human agent will be with you shortly to help.',
      model: 'fallback',
      tokensUsed: { prompt: 0, completion: 0, total: 0 },
      responseTimeMs,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
