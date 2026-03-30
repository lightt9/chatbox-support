import type { ChannelType, NormalizedInboundMessage } from '@chatbox/shared-types';

/**
 * Interface that all channel adapters must implement.
 * Provides a unified API for interacting with different messaging platforms.
 */
export interface IChannelAdapter {
  /**
   * Verify the authenticity of an incoming webhook payload.
   * @param payload - The raw webhook payload
   * @param signature - The signature header sent by the channel provider
   * @returns Whether the signature is valid
   */
  verifyWebhook(payload: unknown, signature: string): Promise<boolean>;

  /**
   * Normalize a raw inbound message into the standard format.
   * @param rawPayload - The raw message payload from the channel provider
   * @returns A normalized inbound message
   */
  normalizeInbound(rawPayload: unknown): Promise<NormalizedInboundMessage>;

  /**
   * Send a text message to a recipient.
   * @param recipient - The recipient identifier on the channel
   * @param text - The text content to send
   * @returns The channel-specific message ID
   */
  sendText(recipient: string, text: string): Promise<string>;

  /**
   * Send a media message to a recipient.
   * @param recipient - The recipient identifier on the channel
   * @param mediaUrl - The URL of the media to send
   * @param caption - Optional caption for the media
   * @returns The channel-specific message ID
   */
  sendMedia(recipient: string, mediaUrl: string, caption?: string): Promise<string>;

  /**
   * Get the channel type this adapter handles.
   * @returns The channel type identifier
   */
  getChannelType(): ChannelType;
}
