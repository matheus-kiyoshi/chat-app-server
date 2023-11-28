import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    transports: ['websocket', 'polling'],
    credentials: true,
  },
  allowEIO3: true,
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private usernames: Record<string, string> = {};

  private emitUsersToClient = () => {
    this.server.emit('userList', {
      users: this.usernames,
    });
  };

  handleConnection(client: Socket) {
    client.on('setUsername', (data) => {
      const username =
        data && data.username
          ? data.username
          : `Usuario ${Object.keys(this.usernames).length + 1}`;
      client['username'] = username;
      this.usernames[client.id] = username;

      this.server.emit('userConnected', {
        username: client['username'],
        userId: client.id,
      });

      this.emitUsersToClient();
    });
  }

  handleDisconnect(client: Socket) {
    const username = client['username'];

    delete this.usernames[client.id];

    this.server.emit('userDisconnected', {
      username,
      userId: client.id,
    });

    this.emitUsersToClient();
  }

  @SubscribeMessage('message')
  handleMessage(
    @MessageBody() data: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.server.emit('message', { data, from: client['username'] });
  }

  @SubscribeMessage('privateMessage')
  handlePrivateMessage(
    @MessageBody() data: { to: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.to(data.to).emit('privateMessage', {
      data: data.message,
      from: client['username'],
    });
  }
}
