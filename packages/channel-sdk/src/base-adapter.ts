import type { ChannelType, NormalizedInboundMessage } from '@chatbox/shared-types';
import type { IChannelAdapter } from './types.js';

/**
 * Configuration required by all channel adapters.
 */
export interface ChannelAdapterConfig {
  /** The channel type this adapter handles */
  channelType: ChannelType;
  /** API token or access token for the channel provider */
  apiToken: string;
  /** Secret used for webhook signature verification */
  webhookSecret: string;
  /** Optional base URL override for the channel provider API */
  apiBaseUrl?: string;
}

/**
 * Abstract base class for channel adapters.
 * Provides common logic and defines the contract for channel-specific implementations.
 */
export abstract class BaseChannelAdapter implements IChannelAdapter {
  protected readonly config: ChannelAdapterConfig;

  constructor(config: ChannelAdapterConfig) {
    this.config = config;
  }

  /**
   * Returns the channel type this adapter handles.
   */
  getChannelType(): ChannelType {
    return this.config.channelType;
  }

  /**
   * Verify the authenticity of an incoming webhook payload.
   * Each channel has its own signature verification mechanism.
   */
  abstract verifyWebhook(payload: unknown, signature: string): Promise<boolean>;

  /**
   * Normalize a raw inbound message from the channel provider
   * into the standard NormalizedInboundMessage format.
   */
  abstract normalizeInbound(rawPayload: unknown): Promise<NormalizedInboundMessage>;

  /**
   * Send a text message to a recipient on this channel.
   * @returns The channel-specific message ID
   */
  abstract sendText(recipient: string, text: string): Promise<string>;

  /**
   * Send a media message to a recipient on this channel.
   * @returns The channel-specific message ID
   */
  abstract sendMedia(recipient: string, mediaUrl: string, caption?: string): Promise<string>;

  /**
   * Helper to build authorization headers for API requests.
   */
  protected getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Helper to build the full API URL for a given path.
   */
  protected buildApiUrl(path: string): string {
    const baseUrl = this.config.apiBaseUrl ?? this.getDefaultApiBaseUrl();
    return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
  }

  /**
   * Returns the default API base URL for the channel provider.
   * Must be implemented by each adapter.
   */
  protected abstract getDefaultApiBaseUrl(): string;
}
