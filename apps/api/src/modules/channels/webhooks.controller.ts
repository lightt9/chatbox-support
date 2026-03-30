import { Controller, Post, Body, Param, Headers, RawBody } from '@nestjs/common';
import { ChannelsService } from './channels.service';

@Controller('api/v1/webhooks')
export class WebhooksController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post(':channel')
  async handleWebhook(
    @Param('channel') channel: string,
    @Body() body: any,
    @Headers() headers: Record<string, string>,
  ) {
    // TODO: Implement webhook handler for incoming channel messages
    // This endpoint is public (no auth guard) as it receives webhooks from external services
    return { message: `TODO: Handle webhook for channel ${channel}` };
  }

  @Post(':channel/verify')
  async verifyWebhook(
    @Param('channel') channel: string,
    @Body() body: any,
    @Headers() headers: Record<string, string>,
  ) {
    // TODO: Implement webhook verification (e.g., for WhatsApp, Messenger setup)
    return { message: `TODO: Verify webhook for channel ${channel}` };
  }
}
