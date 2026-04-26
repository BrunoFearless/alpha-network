import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: ['http://localhost:3000', process.env.FRONTEND_URL].filter(Boolean),
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly chatService: ChatService,
  ) {
    (global as any).chatGateway = this; // Hacky way for now, or use a shared service
  }

  emitNewMessage(conversationId: string, message: any) {
    this.server.to(`conv:${conversationId}`).emit('chat.new_message', message);
  }

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || (client.handshake.headers?.authorization as string | undefined)?.replace('Bearer ', '');
    
    if (!token) {
      client.emit('error', { message: 'Token em falta.' });
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwt.verify<{ sub: string; email: string }>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
      client.data.userId = payload.sub;
      
      // Join a personal room for direct events
      client.join(`user:${payload.sub}`);
      console.log(`[WS Chat] Ligado: ${payload.sub}`);
    } catch {
      client.emit('error', { message: 'Token inválido.' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`[WS Chat] Desligado: ${client.id}`);
  }

  @SubscribeMessage('conversation.join')
  async onJoin(@ConnectedSocket() c: Socket, @MessageBody() data: { conversationId: string }) {
    if (!c.data?.userId || !data?.conversationId) return;
    console.log(`[WS Chat] User ${c.data.userId} joining room: ${data.conversationId}`);
    try {
      await this.chatService.getMessages(data.conversationId, c.data.userId, 1);
      c.join(`conv:${data.conversationId}`);
      c.emit('conversation.joined', { conversationId: data.conversationId });
    } catch (e: any) {
      c.emit('error', { message: e?.message ?? 'Sem permissão.' });
    }
  }

  @SubscribeMessage('conversation.leave')
  onLeave(@ConnectedSocket() c: Socket, @MessageBody() data: { conversationId: string }) {
    if (data?.conversationId) {
      console.log(`[WS Chat] User ${c.data.userId} leaving room: ${data.conversationId}`);
      c.leave(`conv:${data.conversationId}`);
    }
  }

  @SubscribeMessage('chat.send')
  async onMessage(
    @ConnectedSocket() c: Socket,
    @MessageBody() data: { conversationId: string; content: string },
  ) {
    if (!c.data?.userId || !data?.conversationId || !data.content?.trim()) return;

    try {
      const msg = await this.chatService.sendMessage(c.data.userId, {
        conversationId: data.conversationId,
        content: data.content.trim(),
      });
      console.log(`[WS Chat] New message in ${data.conversationId}`);
      this.server.to(`conv:${data.conversationId}`).emit('chat.new_message', msg);
    } catch (e: any) {
      c.emit('error', { message: e?.message ?? 'Erro ao enviar.' });
    }
  }

  @SubscribeMessage('chat.delete')
  async onDelete(@ConnectedSocket() c: Socket, @MessageBody() data: { messageId: string }) {
    if (!c.data?.userId || !data?.messageId) return;
    console.log(`[WS Chat] Deleting message ${data.messageId}`);
    try {
      const msg = await this.chatService.deleteMessage(c.data.userId, data.messageId);
      if (msg) {
        this.server.to(`conv:${msg.conversationId}`).emit('chat.message_deleted', { messageId: data.messageId });
      }
    } catch (e: any) {
      c.emit('error', { message: e?.message ?? 'Erro ao apagar.' });
    }
  }

  @SubscribeMessage('chat.edit')
  async onEdit(@ConnectedSocket() c: Socket, @MessageBody() data: { messageId: string; content: string }) {
    if (!c.data?.userId || !data?.messageId || !data.content?.trim()) return;
    console.log(`[WS Chat] Editing message ${data.messageId}`);
    try {
      const msg = await this.chatService.updateMessage(c.data.userId, data.messageId, data.content.trim());
      if (msg) {
        this.server.to(`conv:${msg.conversationId}`).emit('chat.message_updated', msg);
      }
    } catch (e: any) {
      c.emit('error', { message: e?.message ?? 'Erro ao editar.' });
    }
  }

  @SubscribeMessage('chat.pin')
  async onPin(@ConnectedSocket() c: Socket, @MessageBody() data: { messageId: string }) {
    if (!c.data?.userId || !data?.messageId) return;
    console.log(`[WS Chat] Toggling pin for ${data.messageId}`);
    try {
      const msg = await this.chatService.togglePinMessage(c.data.userId, data.messageId);
      if (msg) {
        this.server.to(`conv:${msg.conversationId}`).emit('chat.message_updated', msg);
      }
    } catch (e: any) {
      c.emit('error', { message: e?.message ?? 'Erro ao fixar.' });
    }
  }

  @SubscribeMessage('chat.react')
  async onReact(@ConnectedSocket() c: Socket, @MessageBody() data: { messageId: string; emoji: string }) {
    if (!c.data?.userId || !data?.messageId || !data.emoji) return;
    console.log(`[WS Chat] Reacting to ${data.messageId} with ${data.emoji}`);
    try {
      const msg = await this.chatService.toggleReaction(c.data.userId, data.messageId, data.emoji);
      if (msg) {
        this.server.to(`conv:${msg.conversationId}`).emit('chat.message_updated', msg);
      }
    } catch (e: any) {
      c.emit('error', { message: e?.message ?? 'Erro ao reagir.' });
    }
  }
}
