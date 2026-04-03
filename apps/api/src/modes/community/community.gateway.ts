import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CommunityService } from './community.service';
import { BotsService } from '../bots/bots.service';

@WebSocketGateway({ namespace: '/community', cors: { origin: ['http://localhost:3000', process.env.FRONTEND_URL].filter(Boolean), credentials: true } })
export class CommunityGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  constructor(private readonly jwt: JwtService, private readonly config: ConfigService, private readonly svc: CommunityService, private readonly bots: BotsService) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || (client.handshake.headers?.authorization as string | undefined)?.replace('Bearer ', '');
    if (!token) { client.emit('error', { message: 'Token em falta.' }); client.disconnect(); return; }
    try {
      const payload = this.jwt.verify<{ sub: string; email: string }>(token, { secret: this.config.get<string>('JWT_ACCESS_SECRET') });
      client.data.userId = payload.sub;
    } catch { client.emit('error', { message: 'Token inválido.' }); client.disconnect(); }
  }

  handleDisconnect(client: Socket) { console.log(`[WS Community] desligado: ${client.id}`); }

  @SubscribeMessage('channel.join')
  async onJoin(@ConnectedSocket() c: Socket, @MessageBody() data: { channelId: string }) {
    if (!c.data?.userId || !data?.channelId) return;
    try { await this.svc.requireChannelMember(data.channelId, c.data.userId); c.join(`ch:${data.channelId}`); c.emit('channel.joined', { channelId: data.channelId }); }
    catch (e: any) { c.emit('error', { message: e?.message ?? 'Sem permissão.' }); }
  }

  @SubscribeMessage('channel.leave')
  onLeave(@ConnectedSocket() c: Socket, @MessageBody() data: { channelId: string }) { if (data?.channelId) c.leave(`ch:${data.channelId}`); }

  @SubscribeMessage('typing.start')
  async onTypingStart(@ConnectedSocket() c: Socket, @MessageBody() data: { channelId: string }) {
    if (!c.data?.userId || !data?.channelId) return;
    try {
      await this.svc.requireChannelMember(data.channelId, c.data.userId);
      c.to(`ch:${data.channelId}`).emit('typing.update', { channelId: data.channelId, userId: c.data.userId, typing: true });
    } catch { /* ignore */ }
  }

  @SubscribeMessage('typing.stop')
  async onTypingStop(@ConnectedSocket() c: Socket, @MessageBody() data: { channelId: string }) {
    if (!c.data?.userId || !data?.channelId) return;
    try {
      await this.svc.requireChannelMember(data.channelId, c.data.userId);
      c.to(`ch:${data.channelId}`).emit('typing.update', { channelId: data.channelId, userId: c.data.userId, typing: false });
    } catch { /* ignore */ }
  }

  @SubscribeMessage('message.send')
  async onMessage(
    @ConnectedSocket() c: Socket,
    @MessageBody() data: { channelId: string; content: string; replyToId?: string | null; attachmentUrls?: string[] },
  ) {
    if (!c.data?.userId || !data?.channelId || !data?.content?.trim()) return;
    try {
      await this.svc.assertNotMuted(data.channelId, c.data.userId);
      await this.svc.requireChannelMember(data.channelId, c.data.userId);
      const msg = await this.svc.saveMessage(data.channelId, c.data.userId, 'user', data.content.trim(), {
        replyToId: data.replyToId ?? null,
        attachmentUrls: data.attachmentUrls?.length ? data.attachmentUrls : undefined,
      });
      this.server.to(`ch:${data.channelId}`).emit('message.new', msg);
      const hit = await this.bots.checkTriggersAndEngine(data.channelId, data.content.trim(), c.data.userId);
      if (hit) {
        setTimeout(async () => {
          try {
            const botMsg = await this.svc.saveMessage(data.channelId, hit.botId, 'bot', hit.content, {
              messageType: hit.messageType,
              imageUrl: hit.imageUrl,
              embedJson: hit.embedJson ?? undefined,
            });
            this.server.to(`ch:${data.channelId}`).emit('message.new', botMsg);
          } catch (err) {
            console.error('[WS Community] bot reply failed', err);
          }
        }, 800);
      }
    } catch (e: any) { c.emit('error', { message: e?.message ?? 'Erro ao enviar.' }); }
  }

  @SubscribeMessage('message.edit')
  async onEdit(
    @ConnectedSocket() c: Socket,
    @MessageBody() data: { channelId: string; messageId: string; content: string },
  ) {
    if (!c.data?.userId || !data?.channelId || !data?.messageId || !data?.content?.trim()) return;
    try {
      await this.svc.requireChannelMember(data.channelId, c.data.userId);
      const updated = await this.svc.editMessage(data.messageId, c.data.userId, data.content.trim());
      this.server.to(`ch:${data.channelId}`).emit('message.updated', updated);
    } catch (e: any) {
      c.emit('error', { message: e?.message ?? 'Não foi possível editar.' });
    }
  }

  @SubscribeMessage('reaction.toggle')
  async onReaction(
    @ConnectedSocket() c: Socket,
    @MessageBody() data: { channelId: string; messageId: string; emoji: string },
  ) {
    if (!c.data?.userId || !data?.channelId || !data?.messageId || !data?.emoji?.trim()) return;
    try {
      await this.svc.requireChannelMember(data.channelId, c.data.userId);
      const res = await this.svc.toggleReaction(data.messageId, c.data.userId, data.emoji.trim());
      this.server.to(`ch:${res.channelId}`).emit('reaction.updated', res);
    } catch (e: any) {
      c.emit('error', { message: e?.message ?? 'Reação falhou.' });
    }
  }

  @SubscribeMessage('message.delete')
  async onDelete(@ConnectedSocket() c: Socket, @MessageBody() data: { messageId: string; channelId: string }) {
    if (!c.data?.userId || !data?.messageId || !data?.channelId) return;
    try {
      await this.svc.requireChannelMember(data.channelId, c.data.userId);
      const res = await this.svc.deleteMessage(data.messageId, c.data.userId);
      this.server.to(`ch:${data.channelId}`).emit('message.deleted', res);
    } catch (e: any) {
      c.emit('error', { message: e?.message ?? 'Não foi possível apagar.' });
    }
  }
}
