import { Module } from '@nestjs/common';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { AssignmentService } from './assignment.service';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [ChatModule],
  controllers: [ConversationController],
  providers: [ConversationService, AssignmentService],
  exports: [ConversationService, AssignmentService],
})
export class ConversationModule {}
