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

  @SubscribeMessage('message.send')
  async onMessage(@ConnectedSocket() c: Socket, @MessageBody() data: { channelId: string; content: string }) {
    if (!c.data?.userId || !data?.channelId || !data?.content?.trim()) return;
    try {
      await this.svc.requireChannelMember(data.channelId, c.data.userId);
      const msg = await this.svc.saveMessage(data.channelId, c.data.userId, 'user', data.content.trim());
      this.server.to(`ch:${data.channelId}`).emit('message.new', msg);
      const hit = await this.bots.checkTriggers(data.channelId, data.content);
      if (hit) {
        setTimeout(async () => {
          const botMsg = await this.svc.saveMessage(data.channelId, hit.botId, 'bot', hit.response);
          this.server.to(`ch:${data.channelId}`).emit('message.new', botMsg);
        }, 800);
      }
    } catch (e: any) { c.emit('error', { message: e?.message ?? 'Erro ao enviar.' }); }
  }
}
