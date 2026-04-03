import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { SettingsModule } from '../settings/settings.module';

// Disable WebSocket gateway in production until socket.io startup hang is resolved
const isProduction = process.env.NODE_ENV === 'production';

@Module({
  imports: [SettingsModule],
  controllers: [ChatController],
  providers: isProduction ? [ChatService] : [ChatService, ChatGateway],
  exports: isProduction ? [ChatService] : [ChatService, ChatGateway],
})
export class ChatModule {}
