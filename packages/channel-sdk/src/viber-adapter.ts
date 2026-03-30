import { createHmac } from 'node:crypto';
import type { NormalizedInboundMessage } from '@chatbox/shared-types';
import { BaseChannelAdapter, type ChannelAdapterConfig } from './base-adapter.js';

export interface ViberAdapterConfig extends Omit<ChannelAdapterConfig, 'channelType'> {
  /** Viber Bot account name */
  botName: string;
}

/**
 * Viber Bot API adapter.
 * Handles webhook verification, message normalization, and sending via the Viber REST API.
 */
export class ViberAdapter extends BaseChannelAdapter {
  private readonly botName: string;

  constructor(config: ViberAdapterConfig) {
    super({ ...config, channelType: 'viber' });
    this.botName = config.botName;
  }

  protected getDefaultApiBaseUrl(): string {
    return 'https://chatapi.viber.com/pa';
  }

  /**
   * Verify Viber webhook signature using HMAC-SHA256.
   * Viber sends the signature in X-Viber-Content-Signature header.
   */
  async verifyWebhook(payload: unknown, signature: string): Promise<boolean> {
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expectedSignature = createHmac('sha256', this.config.webhookSecret)
      .update(payloadString)
      .digest('hex');

    if (expectedSignature.length !== signature.length) {
      return false;
    }

    const expected = Buffer.from(expectedSignature, 'hex');
    const provided = Buffer.from(signature, 'hex');

    if (expected.length !== provided.length) {
      return false;
    }

    // TODO: Replace with crypto.timingSafeEqual for constant-time comparison
    return expected.equals(provided);
  }

  /**
   * Normalize a raw Viber webhook payload into the standard format.
   */
  async normalizeInbound(rawPayload: unknown): Promise<NormalizedInboundMessage> {
    // TODO: Implement full payload parsing for Viber Bot API webhook format
    // Viber sends different event types: message, delivered, seen, failed, etc.
    const payload = rawPayload as Record<string, unknown>;
    const event = payload.event as string;

    if (event !== 'message') {
      throw new Error(`Unsupported Viber event type: ${event}`);
    }

    const sender = payload.sender as Record<string, unknown>;
    const senderId = sender?.id as string;
    const senderName = sender?.name as string;
    const message = payload.message as Record<string, unknown>;
    const messageToken = payload.message_token as number;
    const timestamp = payload.timestamp as number;

    const messageType = message?.type as string;

    let content = '';
    let mediaUrl: string | undefined;
    let contentType: 'text' | 'image' | 'audio' | 'file' | 'location' = 'text';

    if (messageType === 'text') {
      content = (message?.text as string) ?? '';
    } else if (messageType === 'picture') {
      contentType = 'image';
      mediaUrl = message?.media as string;
      content = (message?.text as string) ?? '';
    } else if (messageType === 'video' || messageType === 'file') {
      contentType = 'file';
      mediaUrl = message?.media as string;
      content = (message?.file_name as string) ?? '';
    } else if (messageType === 'location') {
      contentType = 'location';
      const location = message?.location as Record<string, unknown>;
      content = `${location?.lat},${location?.lon}`;
    } else {
      // TODO: Handle contact, sticker, and other message types
      content = `[Unsupported message type: ${messageType}]`;
    }

    return {
      channelType: 'viber',
      channelMessageId: String(messageToken),
      senderIdentifier: senderId,
      contentType,
      content,
      mediaUrl,
      metadata: { senderName, rawType: messageType },
      timestamp: new Date(timestamp),
    };
  }

  /**
   * Send a text message via the Viber REST API.
   * @returns The Viber message token as string
   */
  async sendText(recipient: string, text: string): Promise<string> {
    // TODO: Implement actual HTTP request to Viber REST API
    const _url = this.buildApiUrl('send_message');
    const _body = {
      receiver: recipient,
      min_api_version: 1,
      sender: { name: this.botName },
      type: 'text',
      text,
    };
    const _headers = {
      'X-Viber-Auth-Token': this.config.apiToken,
      'Content-Type': 'application/json',
    };

    // TODO: Make HTTP POST request to _url with _body and _headers
    // const response = await fetch(_url, { method: 'POST', headers: _headers, body: JSON.stringify(_body) });
    // const data = await response.json();
    // return String(data.message_token);

    throw new Error('Viber sendText not yet implemented - awaiting HTTP client integration');
  }

  /**
   * Send a media message (picture) via the Viber REST API.
   * @returns The Viber message token as string
   */
  async sendMedia(recipient: string, mediaUrl: string, caption?: string): Promise<string> {
    // TODO: Implement actual HTTP request to Viber REST API
    const _url = this.buildApiUrl('send_message');
    const _body = {
      receiver: recipient,
      min_api_version: 1,
      sender: { name: this.botName },
      type: 'picture',
      text: caption ?? '',
      media: mediaUrl,
    };
    const _headers = {
      'X-Viber-Auth-Token': this.config.apiToken,
      'Content-Type': 'application/json',
    };

    // TODO: Make HTTP POST request to _url with _body and _headers
    // const response = await fetch(_url, { method: 'POST', headers: _headers, body: JSON.stringify(_body) });
    // const data = await response.json();
    // return String(data.message_token);

    throw new Error('Viber sendMedia not yet implemented - awaiting HTTP client integration');
  }
}
