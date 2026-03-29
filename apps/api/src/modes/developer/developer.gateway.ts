import {
  WebSocketGateway, WebSocketServer,
  OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

// TODO (Alexandre Landa): implementar eventos — ver guia v2-guia-alexandre-landa.docx Dia 12
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

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    // TODO (Alexandre): validar JWT no handshake e guardar userId em client.data
    console.log(`[Developer WS] Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[Developer WS] Cliente desconectado: ${client.id}`);
  }

  // @SubscribeMessage('project.join')
  // @SubscribeMessage('message.send')
}
