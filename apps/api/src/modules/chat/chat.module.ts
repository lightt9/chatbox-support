import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { SettingsModule } from '../settings/settings.module';

const enableWs = process.env.DISABLE_WEBSOCKET !== 'true';

@Module({
  imports: [SettingsModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    ...(enableWs ? [ChatGateway] : []),
  ],
  exports: [
    ChatService,
    ...(enableWs ? [ChatGateway] : []),
  ],
})
export class ChatModule {}
