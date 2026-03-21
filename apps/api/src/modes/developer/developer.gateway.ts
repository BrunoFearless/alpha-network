// ─────────────────────────────────────────────────────────────────
//  DeveloperGateway — Alexandre Landa
//  WebSocket para chat em tempo real nos projectos
//  Namespace: /developer
//  TODO: implementar — ver Guia Individual
// ─────────────────────────────────────────────────────────────────
import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  namespace: '/developer',
  cors: {
    origin: ['http://localhost:3000', process.env.FRONTEND_URL].filter(Boolean),
    credentials: true,
  },
})
export class DeveloperGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    // TODO (Alexandre): validar JWT no handshake e guardar userId no client.data
    console.log(`[Developer WS] Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[Developer WS] Cliente desconectado: ${client.id}`);
  }

  // TODO (Alexandre): implementar eventos — ver Guia Individual
  // @SubscribeMessage('project.join')
  // @SubscribeMessage('message.send')
}
