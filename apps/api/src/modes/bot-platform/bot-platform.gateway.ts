import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';
import { PlatformEvent } from '../../platform-events/platform-events.types';

@WebSocketGateway({
  namespace: '/bots',
  cors: {
    origin: ['http://localhost:3000', process.env.FRONTEND_URL].filter(Boolean) as string[],
    credentials: true,
  },
})
export class BotPlatformGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private readonly prisma: PrismaService) {}

  async handleConnection(client: Socket) {
    const token =
      (client.handshake.auth as { token?: string })?.token ||
      (client.handshake.headers?.authorization as string | undefined)?.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      client.emit('error', { message: 'Token do bot em falta.' });
      client.disconnect();
      return;
    }
    const bot = await this.prisma.bot.findUnique({ where: { token }, select: { id: true } });
    if (!bot) {
      client.emit('error', { message: 'Token do bot inválido.' });
      client.disconnect();
      return;
    }
    client.data.botId = bot.id;
    const links = await this.prisma.serverBot.findMany({
      where: { botId: bot.id },
      select: { serverId: true },
    });
    for (const l of links) client.join(`bot:srv:${l.serverId}`);
    client.emit('ready', { botId: bot.id, serverCount: links.length });
  }

  handleDisconnect(client: Socket) {
    const id = client.data?.botId as string | undefined;
    if (id) console.log(`[WS Bots] desligado bot=${id} socket=${client.id}`);
  }

  emitToServer(serverId: string, event: PlatformEvent) {
    this.server.to(`bot:srv:${serverId}`).emit('platform.event', event);
  }
}
