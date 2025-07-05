import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';
import { SessionsService } from './sessions.service';
import { UsersService } from '../users/users.service';

interface JoinSessionData {
  sessionId: string;
  token: string;
}

interface CursorUpdateData {
  sessionId: string;
  position: {
    lineNumber: number;
    column: number;
  };
}

interface CodeChangeData {
  sessionId: string;
  changes: any[];
  version: number;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
})
@UseGuards(WsJwtGuard)
export class SessionsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly sessionsService: SessionsService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Handle cleanup when user disconnects
    await this.handleUserDisconnect(client);
  }

  @SubscribeMessage('joinSession')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinSessionData,
  ) {
    try {
      // Extract user from JWT token (handled by WsJwtGuard)
      const user = (client as any).user;
      if (!user) {
        client.emit('error', { message: 'Authentication required' });
        return;
      }

      const { sessionId } = data;

      // Join the session room
      await client.join(sessionId);

      // Add user as participant
      await this.sessionsService.addParticipant(sessionId, user._id, client.id);

      // Get session details
      const session = await this.sessionsService.findSessionById(sessionId);
      const participants =
        await this.sessionsService.getActiveParticipants(sessionId);

      // Notify all users in the session
      this.server.to(sessionId).emit('userJoined', {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
        participants: participants.map((p) => ({
          id: p.user._id,
          firstName: p.user.firstName,
          lastName: p.user.lastName,
          email: p.user.email,
          cursorPosition: p.cursorPosition,
        })),
      });

      // Send current session state to the joining user
      client.emit('sessionJoined', {
        session,
        participants: participants.map((p) => ({
          id: p.user._id,
          firstName: p.user.firstName,
          lastName: p.user.lastName,
          email: p.user.email,
          cursorPosition: p.cursorPosition,
        })),
      });
    } catch (error) {
      console.error('Error joining session:', error);
      client.emit('error', { message: 'Failed to join session' });
    }
  }

  @SubscribeMessage('leaveSession')
  async handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    try {
      const user = (client as any).user;
      if (!user) {
        return;
      }

      const { sessionId } = data;

      // Leave the session room
      await client.leave(sessionId);

      // Remove user as participant
      await this.sessionsService.removeParticipant(sessionId, user._id);

      // Notify other users
      this.server.to(sessionId).emit('userLeft', {
        userId: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (error) {
      console.error('Error leaving session:', error);
    }
  }

  @SubscribeMessage('updateCursor')
  async handleUpdateCursor(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CursorUpdateData,
  ) {
    try {
      const user = (client as any).user;
      if (!user) {
        return;
      }

      const { sessionId, position } = data;

      // Update cursor position in database
      await this.sessionsService.updateCursorPosition(
        sessionId,
        user._id,
        position,
      );

      // Broadcast cursor update to other users in the session
      client.to(sessionId).emit('cursorUpdated', {
        userId: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        position,
      });
    } catch (error) {
      console.error('Error updating cursor:', error);
    }
  }

  @SubscribeMessage('codeChange')
  async handleCodeChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CodeChangeData,
  ) {
    try {
      const user = (client as any).user;
      if (!user) {
        return;
      }

      const { sessionId, changes, version } = data;

      // Broadcast code changes to other users in the session
      client.to(sessionId).emit('codeChanged', {
        userId: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        changes,
        version,
      });
    } catch (error) {
      console.error('Error handling code change:', error);
    }
  }

  private async handleUserDisconnect(client: Socket) {
    try {
      const user = (client as any).user;
      if (!user) {
        return;
      }

      // Find all sessions where this user was a participant
      const participants = await this.sessionsService.getActiveParticipants('');
      const userParticipant = participants.find(
        (p) => p.socketId === client.id,
      );

      if (userParticipant) {
        await this.sessionsService.removeParticipant(
          userParticipant.sessionId,
          user._id,
        );

        // Notify other users in the session
        this.server.to(userParticipant.sessionId).emit('userLeft', {
          userId: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
        });
      }
    } catch (error) {
      console.error('Error handling user disconnect:', error);
    }
  }
}
