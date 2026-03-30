import { createHmac } from 'node:crypto';
import type { NormalizedInboundMessage } from '@chatbox/shared-types';
import { BaseChannelAdapter, type ChannelAdapterConfig } from './base-adapter.js';

export interface InstagramAdapterConfig extends Omit<ChannelAdapterConfig, 'channelType'> {
  /** Instagram Business Account ID */
  accountId: string;
}

/**
 * Instagram Messaging API adapter.
 * Handles webhook verification, message normalization, and sending via the Instagram Graph API.
 */
export class InstagramAdapter extends BaseChannelAdapter {
  private readonly accountId: string;

  constructor(config: InstagramAdapterConfig) {
    super({ ...config, channelType: 'instagram' });
    this.accountId = config.accountId;
  }

  protected getDefaultApiBaseUrl(): string {
    return 'https://graph.facebook.com/v21.0';
  }

  /**
   * Verify Instagram webhook signature using HMAC-SHA256.
   * Instagram uses the same verification mechanism as the Facebook platform.
   */
  async verifyWebhook(payload: unknown, signature: string): Promise<boolean> {
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expectedSignature = createHmac('sha256', this.config.webhookSecret)
      .update(payloadString)
      .digest('hex');

    const providedHash = signature.startsWith('sha256=')
      ? signature.slice(7)
      : signature;

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
   * Normalize a raw Instagram webhook payload into the standard format.
   */
  async normalizeInbound(rawPayload: unknown): Promise<NormalizedInboundMessage> {
    // TODO: Implement full payload parsing for Instagram Messaging webhook format
    // The payload structure is: { object: "instagram", entry[].messaging[] }
    const payload = rawPayload as Record<string, unknown>;
    const entry = (payload.entry as Array<Record<string, unknown>>)?.[0];
    const messaging = (entry?.messaging as Array<Record<string, unknown>>)?.[0];

    if (!messaging) {
      throw new Error('No messaging data found in Instagram webhook payload');
    }

    const sender = messaging.sender as Record<string, unknown>;
    const senderId = sender?.id as string;
    const message = messaging.message as Record<string, unknown>;
    const timestamp = messaging.timestamp as number;

    let content = '';
    let mediaUrl: string | undefined;
    let contentType: 'text' | 'image' | 'audio' | 'file' | 'location' = 'text';

    if (message?.text) {
      content = message.text as string;
    } else if (message?.attachments) {
      // TODO: Handle all attachment types (image, video, audio, file)
      const attachments = message.attachments as Array<Record<string, unknown>>;
      const attachment = attachments[0];
      const attachmentType = attachment?.type as string;

      if (attachmentType === 'image') {
        contentType = 'image';
        const attachmentPayload = attachment?.payload as Record<string, unknown>;
        mediaUrl = attachmentPayload?.url as string;
      } else {
        content = `[Unsupported attachment type: ${attachmentType}]`;
      }
    }

    return {
      channelType: 'instagram',
      channelMessageId: (message?.mid as string) ?? '',
      senderIdentifier: senderId,
      contentType,
      content,
      mediaUrl,
      metadata: { rawMessage: message },
      timestamp: new Date(timestamp),
    };
  }

  /**
   * Send a text message via the Instagram Graph API.
   * @returns The Instagram message ID
   */
  async sendText(recipient: string, text: string): Promise<string> {
    // TODO: Implement actual HTTP request to Instagram Graph API
    const _url = this.buildApiUrl(`${this.accountId}/messages`);
    const _body = {
      recipient: { id: recipient },
      message: { text },
    };
    const _headers = this.getAuthHeaders();

    // TODO: Make HTTP POST request to _url with _body and _headers
    // const response = await fetch(_url, { method: 'POST', headers: _headers, body: JSON.stringify(_body) });
    // const data = await response.json();
    // return data.message_id;

    throw new Error('Instagram sendText not yet implemented - awaiting HTTP client integration');
  }

  /**
   * Send a media message via the Instagram Graph API.
   * @returns The Instagram message ID
   */
  async sendMedia(recipient: string, mediaUrl: string, caption?: string): Promise<string> {
    // TODO: Implement actual HTTP request to Instagram Graph API
    const _url = this.buildApiUrl(`${this.accountId}/messages`);
    const _body = {
      recipient: { id: recipient },
      message: {
        attachment: {
          type: 'image',
          payload: { url: mediaUrl },
        },
        text: caption,
      },
    };
    const _headers = this.getAuthHeaders();

    // TODO: Make HTTP POST request to _url with _body and _headers
    // const response = await fetch(_url, { method: 'POST', headers: _headers, body: JSON.stringify(_body) });
    // const data = await response.json();
    // return data.message_id;

    throw new Error('Instagram sendMedia not yet implemented - awaiting HTTP client integration');
  }
}
