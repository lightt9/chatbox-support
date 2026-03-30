import { Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { WebhooksController } from './webhooks.controller';
import { ChannelsService } from './channels.service';

@Module({
  controllers: [ChannelsController, WebhooksController],
  providers: [ChannelsService],
  exports: [ChannelsService],
})
export class ChannelsModule {}
