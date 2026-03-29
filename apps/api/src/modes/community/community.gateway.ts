import {
  WebSocketGateway, WebSocketServer,
  OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

// TODO (Bruno Fearless): implementar eventos — ver guia v2-guia-bruno-fearless.docx Dias 10-11
@WebSocketGateway({
  namespace: '/community',
  cors: {
    origin: ['http://localhost:3000', process.env.FRONTEND_URL].filter(Boolean),
    credentials: true,
  },
})
export class CommunityGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    // TODO (Bruno): validar JWT no handshake
    console.log(`[Community WS] Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[Community WS] Cliente desconectado: ${client.id}`);
  }

  // @SubscribeMessage('channel.join')
  // @SubscribeMessage('message.send')
}
