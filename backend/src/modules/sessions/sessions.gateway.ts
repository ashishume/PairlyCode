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
  code?: string;
}

interface UpdateCodeData {
  sessionId: string;
  code: string;
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
      console.log('Join session request:', { clientId: client.id, data });

      // Extract user from JWT token (handled by WsJwtGuard)
      const user = client.data.user;
      console.log('User from JWT:', user);

      if (!user) {
        console.log('No user found in client.data');
        client.emit('error', { message: 'Authentication required' });
        return;
      }

      const { sessionId } = data;

      if (!sessionId) {
        console.log('No sessionId provided in joinSession request');
        client.emit('error', { message: 'Session ID is required' });
        return;
      }

      // Join the session room
      await client.join(sessionId);

      // Get full user data from database
      const fullUser = await this.usersService.findOne(user.sub);
      if (!fullUser) {
        client.emit('error', { message: 'User not found' });
        return;
      }

      // Add user as participant
      await this.sessionsService.addParticipant(
        sessionId,
        fullUser._id,
        client.id,
      );

      // Get session details
      const session = await this.sessionsService.findSessionById(sessionId);
      const participants =
        await this.sessionsService.getActiveParticipants(sessionId);

      // Notify all users in the session
      const userJoinedData = {
        user: {
          id: fullUser._id,
          firstName: fullUser.firstName,
          lastName: fullUser.lastName,
          email: fullUser.email,
        },
        participants: participants.map((p) => ({
          id: p.user._id,
          firstName: p.user.firstName,
          lastName: p.user.lastName,
          email: p.user.email,
          cursorPosition: p.cursorPosition,
        })),
      };

      this.server.to(sessionId).emit('userJoined', userJoinedData);

      // Send current session state to the joining user
      const sessionJoinedData = {
        session,
        participants: participants.map((p) => ({
          id: p.user._id,
          firstName: p.user.firstName,
          lastName: p.user.lastName,
          email: p.user.email,
          cursorPosition: p.cursorPosition,
        })),
      };

      client.emit('sessionJoined', sessionJoinedData);
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
      const user = client.data.user;
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
      console.log('Cursor update request:', { clientId: client.id, data });

      const user = client.data.user;
      if (!user) {
        console.log('No user found for cursor update');
        return;
      }

      const { sessionId, position } = data;

      if (!sessionId) {
        console.log('No sessionId provided in cursor update');
        return;
      }

      // Get full user data from database
      const fullUser = await this.usersService.findOne(user.sub);
      if (!fullUser) {
        console.log('User not found in database for cursor update:', user.sub);
        return;
      }

      // Update cursor position in database
      await this.sessionsService.updateCursorPosition(
        sessionId,
        fullUser._id,
        position,
      );

      // Broadcast cursor update to other users in the session
      const cursorData = {
        userId: fullUser._id.toString(), // Convert ObjectId to string
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        position,
      };

      console.log('Broadcasting cursor update to room:', sessionId, cursorData);
      client.to(sessionId).emit('cursorUpdated', cursorData);
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
      console.log('Code change request:', { clientId: client.id, data });

      const user = client.data.user;
      if (!user) {
        console.log('No user found for code change');
        return;
      }

      const { sessionId, changes, version } = data;

      if (!sessionId) {
        console.log('No sessionId provided in code change');
        return;
      }

      // Get full user data from database
      const fullUser = await this.usersService.findOne(user.sub);
      if (!fullUser) {
        console.log('User not found in database for code change:', user.sub);
        return;
      }

      // Update the session code in the database
      // Note: This is a simplified approach. In a real implementation,
      // you might want to apply the changes to the current code
      // For now, we'll just update with the latest code if provided
      if (data.code) {
        await this.sessionsService.updateSessionCode(sessionId, data.code);
      }

      // Broadcast code changes to other users in the session
      const codeChangeData = {
        userId: fullUser._id.toString(), // Convert ObjectId to string
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        changes,
        version,
      };

      console.log(
        'Broadcasting code change to room:',
        sessionId,
        codeChangeData,
      );
      client.to(sessionId).emit('codeChanged', codeChangeData);
    } catch (error) {
      console.error('Error handling code change:', error);
    }
  }

  @SubscribeMessage('updateCode')
  async handleUpdateCode(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UpdateCodeData,
  ) {
    try {
      console.log('Update code request:', { clientId: client.id, data });

      const user = client.data.user;
      if (!user) {
        console.log('No user found for code update');
        return;
      }

      const { sessionId, code } = data;

      if (!sessionId) {
        console.log('No sessionId provided in code update');
        return;
      }

      // Get full user data from database
      const fullUser = await this.usersService.findOne(user.sub);
      if (!fullUser) {
        console.log('User not found in database for code update:', user.sub);
        return;
      }

      // Update the session code in the database
      await this.sessionsService.updateSessionCode(sessionId, code);

      // Broadcast code update to other users in the session
      const codeUpdateData = {
        userId: fullUser._id.toString(),
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        code,
      };

      console.log(
        'Broadcasting code update to room:',
        sessionId,
        codeUpdateData,
      );
      client.to(sessionId).emit('codeUpdated', codeUpdateData);
    } catch (error) {
      console.error('Error handling code update:', error);
    }
  }

  private async handleUserDisconnect(client: Socket) {
    try {
      const user = client.data.user;
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
