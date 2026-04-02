import { Injectable, NotFoundException } from '@nestjs/common';
import { LeadRepository } from './leads.repository';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

/* ── Domain logic: AI lead intelligence ─────────────────────────────────────── */

const HOT_KEYWORDS = /\b(price|pricing|buy|purchase|urgent|asap|budget|cost|quote|order|subscribe|plan|upgrade|demo|trial)\b/i;
const WARM_KEYWORDS = /\b(how|what|can you|do you|support|help|integrate|feature|compare|recommend)\b/i;

function computeRating(text: string): 'hot' | 'warm' | 'cold' {
  if (HOT_KEYWORDS.test(text)) return 'hot';
  if (WARM_KEYWORDS.test(text)) return 'warm';
  if (text.length < 20) return 'cold';
  return 'warm';
}

const INTENT_RULES: { pattern: RegExp; intent: string; boost: number }[] = [
  { pattern: /\b(price|pricing|cost|quote|how much|pay|subscription|plan)\b/i, intent: 'Purchase Intent', boost: 30 },
  { pattern: /\b(demo|trial|free trial|test|try)\b/i, intent: 'Demo Request', boost: 25 },
  { pattern: /\b(integrat|api|webhook|sdk|connect|setup)\b/i, intent: 'Technical Inquiry', boost: 15 },
  { pattern: /\b(help|support|issue|problem|bug|broken|error|fix)\b/i, intent: 'Support Request', boost: 10 },
  { pattern: /\b(cancel|refund|stop|unsubscribe|close account)\b/i, intent: 'Churn Risk', boost: 5 },
  { pattern: /\b(how|what|when|where|can you|do you|tell me)\b/i, intent: 'General Inquiry', boost: 10 },
];

function detectIntent(text: string): string {
  for (const rule of INTENT_RULES) {
    if (rule.pattern.test(text)) return rule.intent;
  }
  return 'Exploring';
}

function computeScore(text: string, messageCount: number, rating: string): number {
  let score = 10;

  // Intent boost
  for (const rule of INTENT_RULES) {
    if (rule.pattern.test(text)) { score += rule.boost; break; }
  }

  // Message engagement (more messages = more engaged, cap at 20)
  score += Math.min(messageCount, 10) * 2;

  // Rating boost
  if (rating === 'hot') score += 20;
  else if (rating === 'warm') score += 10;

  // Message length engagement
  if (text.length > 100) score += 5;
  if (text.length > 200) score += 5;

  return Math.min(score, 100);
}

function generateSummary(firstMessage: string, lastMessage: string | null, messageCount: number): string {
  const msg = firstMessage.length > 100 ? firstMessage.slice(0, 100) + '...' : firstMessage;
  if (messageCount <= 1) return msg;
  const last = lastMessage && lastMessage !== firstMessage
    ? ` Last: "${lastMessage.length > 60 ? lastMessage.slice(0, 60) + '...' : lastMessage}"`
    : '';
  return `${msg}${last}`;
}

@Injectable()
export class LeadsService {
  constructor(private readonly repo: LeadRepository) {}

  /* ── List ─────────────────────────────────────────────────────────────────── */

  async findAll(companyId: string, filters: { search?: string; status?: string; rating?: string }) {
    const [leads, counts] = await Promise.all([
      this.repo.findAll(companyId, filters),
      this.repo.countByStatus(companyId),
    ]);

    return {
      leads,
      counts: {
        new: counts.new ?? 0,
        contacted: counts.contacted ?? 0,
        qualified: counts.qualified ?? 0,
        converted: counts.converted ?? 0,
        lost: counts.lost ?? 0,
      },
      total: leads.length,
    };
  }

  /* ── Get one ──────────────────────────────────────────────────────────────── */

  async findOne(companyId: string, id: string) {
    const lead = await this.repo.findById(companyId, id);
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  /* ── Manual create ────────────────────────────────────────────────────────── */

  async create(companyId: string, userId: string, dto: CreateLeadDto) {
    const displayId = await this.repo.nextDisplayId();
    return this.repo.insert({
      display_id: displayId,
      company_id: companyId,
      name: dto.name,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      company_name: dto.companyName ?? null,
      title: dto.title ?? null,
      source: dto.source ?? 'manual',
      rating: dto.rating ?? 'warm',
      assigned_to: dto.assignedTo ?? null,
      notes: dto.notes ?? null,
      created_by: userId,
    });
  }

  /* ── Create from chat (dedup by email) ────────────────────────────────────── */

  async createFromChat(companyId: string, data: {
    conversationId: string;
    name: string;
    email?: string;
    phone?: string;
    companyName?: string;
    firstMessage: string;
    customFields?: Record<string, string>;
  }) {
    const rating = computeRating(data.firstMessage);
    const intent = detectIntent(data.firstMessage);
    const score = computeScore(data.firstMessage, 1, rating);
    const aiSummary = generateSummary(data.firstMessage, null, 1);

    // Dedup: update existing lead if email matches
    if (data.email) {
      const existing = await this.repo.findByEmail(companyId, data.email);
      if (existing) {
        return this.repo.updateById(existing.id, {
          conversation_id: data.conversationId,
          first_message: data.firstMessage,
          last_message: data.firstMessage,
          message_count: 1,
          updated_at: new Date(),
          name: data.name || existing.name,
          phone: data.phone || existing.phone,
          company_name: data.companyName || existing.companyName,
          custom_fields: JSON.stringify(data.customFields ?? {}),
          rating, intent, score, ai_summary: aiSummary,
        });
      }
    }

    const displayId = await this.repo.nextDisplayId();
    return this.repo.insert({
      display_id: displayId,
      company_id: companyId,
      name: data.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      company_name: data.companyName ?? null,
      source: 'chat_widget',
      rating, intent, score, ai_summary: aiSummary,
      conversation_id: data.conversationId,
      first_message: data.firstMessage,
      last_message: data.firstMessage,
      message_count: 1,
      custom_fields: JSON.stringify(data.customFields ?? {}),
    });
  }

  /* ── Sync from message ────────────────────────────────────────────────────── */

  async syncFromMessage(conversationId: string, message: string, senderType: string) {
    const lead = await this.repo.findByConversationId(conversationId);
    if (!lead) return null;

    const newMsgCount = (lead.message_count ?? 0) + 1;
    const sets: string[] = ['last_message = $1', 'message_count = message_count + 1', 'updated_at = NOW()'];
    const params: any[] = [message];
    let idx = 2;

    // Auto-upgrade rating when customer mentions hot keywords
    if (senderType === 'customer') {
      const newRating = computeRating(message);
      if (newRating === 'hot' && lead.rating !== 'hot') {
        sets.push(`rating = $${idx}`);
        params.push('hot');
        idx++;
      }

      // Upgrade intent if higher-value intent detected
      const newIntent = detectIntent(message);
      const intentPriority = ['Exploring', 'General Inquiry', 'Support Request', 'Technical Inquiry', 'Demo Request', 'Purchase Intent'];
      if (intentPriority.indexOf(newIntent) > intentPriority.indexOf(lead.intent ?? 'Exploring')) {
        sets.push(`intent = $${idx}`);
        params.push(newIntent);
        idx++;
      }
    }

    // Recompute score
    const currentRating = lead.rating === 'hot' ? 'hot' : computeRating(message) === 'hot' ? 'hot' : lead.rating;
    const newScore = computeScore(message, newMsgCount, currentRating);
    if (newScore > (lead.score ?? 0)) {
      sets.push(`score = $${idx}`);
      params.push(newScore);
      idx++;
    }

    // Auto-advance: new → contacted when agent/ai replies
    if ((senderType === 'ai' || senderType === 'operator') && lead.status === 'new') {
      sets.push(`status = $${idx}`);
      params.push('contacted');
      idx++;
      sets.push('last_contacted = NOW()');
    }

    await this.repo.updateByConversation(conversationId, sets, params);
  }

  /* ── Update ───────────────────────────────────────────────────────────────── */

  async update(companyId: string, id: string, dto: UpdateLeadDto) {
    const sets: string[] = ['updated_at = NOW()'];
    const params: any[] = [];
    let idx = 1;

    const fields: [string, any][] = [
      ['name', dto.name], ['email', dto.email], ['phone', dto.phone],
      ['company_name', dto.companyName], ['title', dto.title], ['source', dto.source],
      ['status', dto.status], ['rating', dto.rating], ['assigned_to', dto.assignedTo],
      ['notes', dto.notes], ['lost_reason', dto.lostReason],
    ];

    for (const [col, val] of fields) {
      if (val !== undefined) {
        sets.push(`${col} = $${idx}`);
        params.push(val);
        idx++;
      }
    }

    if (dto.status === 'converted') sets.push('converted_at = NOW()');
    if (dto.status === 'contacted' || dto.status === 'qualified') sets.push('last_contacted = NOW()');

    const lead = await this.repo.update(id, companyId, sets, params);
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  /* ── Delete ───────────────────────────────────────────────────────────────── */

  async remove(companyId: string, id: string) {
    const deleted = await this.repo.delete(companyId, id);
    if (!deleted) throw new NotFoundException('Lead not found');
    return { message: 'Lead deleted' };
  }
}
