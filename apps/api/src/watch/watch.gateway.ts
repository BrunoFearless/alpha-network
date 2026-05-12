import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'watch-party',
})
export class WatchPartyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('WatchPartyGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() data: { videoId: string; user: any },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.videoId);
    this.logger.log(`User ${data.user?.username} joined room ${data.videoId}`);
    
    // Notify others in the room
    client.to(data.videoId).emit('userJoined', data.user);
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() videoId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(videoId);
    this.logger.log(`Client ${client.id} left room ${videoId}`);
  }

  @SubscribeMessage('play')
  handlePlay(@MessageBody() data: { videoId: string; time: number }) {
    this.server.to(data.videoId).emit('play', data.time);
  }

  @SubscribeMessage('pause')
  handlePause(@MessageBody() data: { videoId: string; time: number }) {
    this.server.to(data.videoId).emit('pause', data.time);
  }

  @SubscribeMessage('seek')
  handleSeek(@MessageBody() data: { videoId: string; time: number }) {
    this.server.to(data.videoId).emit('seek', data.time);
  }

  @SubscribeMessage('sync')
  handleSync(@MessageBody() data: { videoId: string; time: number }) {
    // Only broadcast to others to avoid infinite loops if not handled carefully
    this.server.to(data.videoId).emit('sync', data.time);
  }

  @SubscribeMessage('reaction')
  handleReaction(@MessageBody() data: { videoId: string; emoji: string; left: number }) {
    this.server.to(data.videoId).emit('reaction', { emoji: data.emoji, left: data.left });
  }
}
