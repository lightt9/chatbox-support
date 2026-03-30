import { createHmac } from 'node:crypto';
import type { NormalizedInboundMessage } from '@chatbox/shared-types';
import { BaseChannelAdapter, type ChannelAdapterConfig } from './base-adapter.js';

export interface WhatsAppAdapterConfig extends Omit<ChannelAdapterConfig, 'channelType'> {
  /** WhatsApp Business Account phone number ID */
  phoneNumberId: string;
}

/**
 * WhatsApp Cloud API adapter.
 * Handles webhook verification, message normalization, and sending via the WhatsApp Cloud API.
 */
export class WhatsAppAdapter extends BaseChannelAdapter {
  private readonly phoneNumberId: string;

  constructor(config: WhatsAppAdapterConfig) {
    super({ ...config, channelType: 'whatsapp' });
    this.phoneNumberId = config.phoneNumberId;
  }

  protected getDefaultApiBaseUrl(): string {
    return 'https://graph.facebook.com/v21.0';
  }

  /**
   * Verify WhatsApp webhook signature using HMAC-SHA256.
   * The signature is computed over the raw payload body using the app secret.
   */
  async verifyWebhook(payload: unknown, signature: string): Promise<boolean> {
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expectedSignature = createHmac('sha256', this.config.webhookSecret)
      .update(payloadString)
      .digest('hex');

    const providedHash = signature.startsWith('sha256=')
      ? signature.slice(7)
      : signature;

    // Use timing-safe comparison to prevent timing attacks
    if (expectedSignature.length !== providedHash.length) {
      return false;
    }

    const expected = Buffer.from(expectedSignature, 'hex');
    const provided = Buffer.from(providedHash, 'hex');

    if (expected.length !== provided.length) {
      return false;
    }

    // TODO: Replace with crypto.timingSafeEqual for constant-time comparison
    return expected.equals(provided);
  }

  /**
   * Normalize a raw WhatsApp Cloud API webhook payload into the standard format.
   */
  async normalizeInbound(rawPayload: unknown): Promise<NormalizedInboundMessage> {
    // TODO: Implement full payload parsing for WhatsApp Cloud API webhook format
    // The payload structure is: { object, entry[].changes[].value.messages[] }
    const payload = rawPayload as Record<string, unknown>;
    const entry = (payload.entry as Array<Record<string, unknown>>)?.[0];
    const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
    const value = changes?.value as Record<string, unknown>;
    const messages = (value?.messages as Array<Record<string, unknown>>)?.[0];

    if (!messages) {
      throw new Error('No messages found in WhatsApp webhook payload');
    }

    const messageType = messages.type as string;
    const from = messages.from as string;
    const messageId = messages.id as string;
    const timestamp = messages.timestamp as string;

    // TODO: Handle all message types (image, audio, document, location, etc.)
    let content = '';
    let mediaUrl: string | undefined;
    let contentType: 'text' | 'image' | 'audio' | 'file' | 'location' = 'text';

    if (messageType === 'text') {
      const textObj = messages.text as Record<string, unknown>;
      content = (textObj?.body as string) ?? '';
    } else if (messageType === 'image') {
      contentType = 'image';
      const imageObj = messages.image as Record<string, unknown>;
      content = (imageObj?.caption as string) ?? '';
      mediaUrl = imageObj?.id as string; // TODO: Fetch actual media URL via API
    } else {
      // TODO: Handle audio, document, location, and other message types
      content = `[Unsupported message type: ${messageType}]`;
    }

    return {
      channelType: 'whatsapp',
      channelMessageId: messageId,
      senderIdentifier: from,
      contentType,
      content,
      mediaUrl,
      metadata: { rawType: messageType },
      timestamp: new Date(parseInt(timestamp, 10) * 1000),
    };
  }

  /**
   * Send a text message via the WhatsApp Cloud API.
   * @returns The WhatsApp message ID
   */
  async sendText(recipient: string, text: string): Promise<string> {
    // TODO: Implement actual HTTP request to WhatsApp Cloud API
    const _url = this.buildApiUrl(`${this.phoneNumberId}/messages`);
    const _body = {
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'text',
      text: { body: text },
    };
    const _headers = this.getAuthHeaders();

    // TODO: Make HTTP POST request to _url with _body and _headers
    // const response = await fetch(_url, { method: 'POST', headers: _headers, body: JSON.stringify(_body) });
    // const data = await response.json();
    // return data.messages[0].id;

    throw new Error('WhatsApp sendText not yet implemented - awaiting HTTP client integration');
  }

  /**
   * Send a media message (image) via the WhatsApp Cloud API.
   * @returns The WhatsApp message ID
   */
  async sendMedia(recipient: string, mediaUrl: string, caption?: string): Promise<string> {
    // TODO: Implement actual HTTP request to WhatsApp Cloud API
    const _url = this.buildApiUrl(`${this.phoneNumberId}/messages`);
    const _body = {
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'image',
      image: {
        link: mediaUrl,
        caption: caption ?? '',
      },
    };
    const _headers = this.getAuthHeaders();

    // TODO: Make HTTP POST request to _url with _body and _headers
    // const response = await fetch(_url, { method: 'POST', headers: _headers, body: JSON.stringify(_body) });
    // const data = await response.json();
    // return data.messages[0].id;

    throw new Error('WhatsApp sendMedia not yet implemented - awaiting HTTP client integration');
  }
}
