import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

interface TypingPayload {
  conversationId: string;
  companyId?: string;
  senderType: 'customer' | 'agent';
  senderName?: string;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:conversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(`conversation:${data.conversationId}`);
    this.logger.log(`Client ${client.id} joined conversation:${data.conversationId}`);
  }

  @SubscribeMessage('leave:conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conversation:${data.conversationId}`);
  }

  @SubscribeMessage('join:dashboard')
  handleJoinDashboard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { companyId: string },
  ) {
    client.join(`dashboard:${data.companyId}`);
    this.logger.log(`Dashboard client ${client.id} joined company:${data.companyId}`);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TypingPayload,
  ) {
    client
      .to(`conversation:${data.conversationId}`)
      .emit('typing', data);
  }

  @SubscribeMessage('stop:typing')
  handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TypingPayload,
  ) {
    client
      .to(`conversation:${data.conversationId}`)
      .emit('stop:typing', data);
    if (data.companyId) {
      client
        .to(`dashboard:${data.companyId}`)
        .emit('stop:typing', data);
    }
  }

  @SubscribeMessage('typing:preview')
  handleTypingPreview(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      conversationId: string;
      companyId?: string;
      senderType: 'customer' | 'agent';
      senderName?: string;
      draft: string;
    },
  ) {
    this.logger.debug(
      `typing:preview from ${data.senderName} [${data.senderType}] conv=${data.conversationId} company=${data.companyId} draft="${data.draft?.slice(0, 30)}"`,
    );
    // Send to conversation room
    client
      .to(`conversation:${data.conversationId}`)
      .emit('typing:preview', data);

    // Also broadcast to dashboard room so agents see it even before
    // they've selected this specific conversation
    if (data.companyId) {
      client
        .to(`dashboard:${data.companyId}`)
        .emit('typing:preview', data);
    }
  }

  /** Emit a new message to everyone in the conversation room + dashboard */
  emitNewMessage(
    companyId: string,
    conversationId: string,
    message: {
      id: string;
      conversationId: string;
      senderType: string;
      senderName: string;
      body: string;
      createdAt: string;
    },
  ) {
    this.server
      .to(`conversation:${conversationId}`)
      .emit('message:new', message);

    this.server
      .to(`dashboard:${companyId}`)
      .emit('message:new', message);
  }

  /** Notify dashboard that a conversation was created or updated */
  emitConversationUpdate(
    companyId: string,
    conversationId: string,
    update: Record<string, unknown>,
  ) {
    this.server
      .to(`dashboard:${companyId}`)
      .emit('conversation:update', { conversationId, ...update });
  }

  @SubscribeMessage('message:seen')
  handleMessageSeen(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; seenBy: string; seenByType: 'customer' | 'agent' },
  ) {
    // Broadcast to conversation room (so the other side knows)
    client
      .to(`conversation:${data.conversationId}`)
      .emit('message:seen', data);

    // Also notify dashboard if customer saw the message
    if (data.seenByType === 'customer') {
      this.server
        .to(`dashboard:${data.conversationId}`)
        .emit('message:seen', data);
    }
  }

  /** Notify widget that an agent joined the conversation */
  emitAgentJoined(
    conversationId: string,
    agentName: string,
  ) {
    this.server
      .to(`conversation:${conversationId}`)
      .emit('agent:joined', { conversationId, agentName });
  }

  /** Emit message:seen event programmatically */
  emitMessageSeen(
    conversationId: string,
    seenBy: string,
    seenByType: 'customer' | 'agent',
  ) {
    this.server
      .to(`conversation:${conversationId}`)
      .emit('message:seen', { conversationId, seenBy, seenByType });
  }
}
