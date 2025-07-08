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
  version: number;
  code: string;
}

interface UpdateCodeData {
  userId: string;
  sessionId: string;
  code: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
})
@UseGuards(WsJwtGuard)
export class SessionsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedClients = new Map<
    string,
    { userId: string; sessionId?: string }
  >();

  constructor(
    private readonly sessionsService: SessionsService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      console.log(`Client connected: ${client.id}`);

      // Store client info
      const user = client.data.user;
      if (user) {
        this.connectedClients.set(client.id, { userId: user.sub });
      }

      // Send connection acknowledgment
      client.emit('connected', {
        socketId: client.id,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error in handleConnection:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      console.log(`Client disconnected: ${client.id}`);

      // Clean up client info
      this.connectedClients.delete(client.id);

      // Handle cleanup when user disconnects
      await this.handleUserDisconnect(client);
    } catch (error) {
      console.error('Error in handleDisconnect:', error);
    }
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
        return { success: false, error: 'Authentication required' };
      }

      const { sessionId } = data;

      if (!sessionId) {
        console.log('No sessionId provided in joinSession request');
        client.emit('error', { message: 'Session ID is required' });
        return { success: false, error: 'Session ID is required' };
      }

      // Check if session exists
      const session = await this.sessionsService.findSessionById(sessionId);
      if (!session) {
        client.emit('error', { message: 'Session not found' });
        return { success: false, error: 'Session not found' };
      }

      // Leave any previous session
      const clientInfo = this.connectedClients.get(client.id);
      if (clientInfo?.sessionId && clientInfo.sessionId !== sessionId) {
        await client.leave(clientInfo.sessionId);
        await this.sessionsService.removeParticipant(
          clientInfo.sessionId,
          user.sub,
        );
      }

      // Join the session room
      await client.join(sessionId);
      console.log(`Client ${client.id} joined room ${sessionId}`);

      // Update client info
      this.connectedClients.set(client.id, { userId: user.sub, sessionId });

      // Get full user data from database
      const fullUser = await this.usersService.findOne(user.sub);
      if (!fullUser) {
        client.emit('error', { message: 'User not found' });
        return { success: false, error: 'User not found' };
      }

      // Add user as participant
      await this.sessionsService.addParticipant(
        sessionId,
        fullUser._id,
        client.id,
      );
      console.log(
        `User ${fullUser._id} added as participant to session ${sessionId}`,
      );

      // Get updated participants list
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

      // Return acknowledgment
      return {
        success: true,
        sessionId,
        participantsCount: participants.length,
      };
    } catch (error) {
      console.error('Error joining session:', error);
      client.emit('error', { message: 'Failed to join session' });
      return { success: false, error: 'Failed to join session' };
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
        return { success: false, error: 'Authentication required' };
      }

      const { sessionId } = data;

      // Leave the session room
      await client.leave(sessionId);

      // Update client info
      const clientInfo = this.connectedClients.get(client.id);
      if (clientInfo) {
        clientInfo.sessionId = undefined;
        this.connectedClients.set(client.id, clientInfo);
      }

      // Remove user as participant
      await this.sessionsService.removeParticipant(sessionId, user.sub);

      // Notify other users
      this.server.to(sessionId).emit('userLeft', {
        userId: user.sub,
        firstName: user.firstName,
        lastName: user.lastName,
      });

      return { success: true, sessionId };
    } catch (error) {
      console.error('Error leaving session:', error);
      return { success: false, error: 'Failed to leave session' };
    }
  }

  @SubscribeMessage('updateCursor')
  async handleUpdateCursor(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CursorUpdateData,
  ) {
    try {
      const user = client.data.user;
      if (!user) {
        return { success: false, error: 'Authentication required' };
      }

      const { sessionId, position } = data;

      if (!sessionId) {
        return { success: false, error: 'Session ID is required' };
      }

      // Get full user data from database
      const fullUser = await this.usersService.findOne(user.sub);
      if (!fullUser) {
        return { success: false, error: 'User not found' };
      }

      // Update cursor position in database
      await this.sessionsService.updateCursorPosition(
        sessionId,
        fullUser._id,
        position,
      );

      // Broadcast cursor update to other users in the session
      const cursorData = {
        userId: fullUser._id.toString(),
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        position,
        timestamp: Date.now(),
      };

      client.to(sessionId).emit('cursorUpdated', cursorData);
      return { success: true };
    } catch (error) {
      console.error('Error updating cursor:', error);
      return { success: false, error: 'Failed to update cursor' };
    }
  }

  @SubscribeMessage('codeChange')
  async handleCodeChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CodeChangeData,
  ) {
    try {
      const user = client.data.user;
      if (!user) {
        return { success: false, error: 'Authentication required' };
      }

      const { sessionId, code, version } = data;

      if (!sessionId || sessionId.trim() === '') {
        return { success: false, error: 'Session ID is required' };
      }

      // Get full user data from database
      const fullUser = await this.usersService.findOne(user.sub);
      if (!fullUser) {
        return { success: false, error: 'User not found' };
      }

      // Get current session code to apply changes
      const session = await this.sessionsService.findSessionById(sessionId);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      await this.sessionsService.updateSessionCode(sessionId, code);

      // Broadcast code changes to other users in the session
      const codeChangeData = {
        userId: fullUser._id.toString(),
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        code,
        version,
        timestamp: Date.now(),
      };

      client.to(sessionId).emit('codeChanged', codeChangeData);
      return { success: true, version };
    } catch (error) {
      console.error('Error handling code change:', error);
      return { success: false, error: 'Failed to process code change' };
    }
  }

  @SubscribeMessage('ping')
  async handlePing(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { timestamp: number },
  ) {
    try {
      client.emit('pong', {
        timestamp: data.timestamp,
        serverTime: Date.now(),
        latency: Date.now() - data.timestamp,
      });
      return { success: true };
    } catch (error) {
      console.error('Error handling ping:', error);
      return { success: false, error: 'Failed to process ping' };
    }
  }

  @SubscribeMessage('updateCode')
  async handleUpdateCode(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UpdateCodeData,
  ) {
    try {
      const user = client.data.user;
      if (!user) {
        return { success: false, error: 'Authentication required' };
      }

      const { sessionId, code, userId } = data;
      if (!sessionId) {
        return { success: false, error: 'Session ID is required' };
      }

      // Get full user data from database
      const fullUser = await this.usersService.findOne(userId);
      if (!fullUser) {
        return { success: false, error: 'User not found' };
      }

      // Update the session code in the database
      await this.sessionsService.updateSessionCode(sessionId, code);

      // Broadcast code update to other users in the session
      const codeUpdateData = {
        userId,
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        code,
        timestamp: Date.now(),
      };

      client.to(sessionId).emit('codeUpdated', codeUpdateData);
      return { success: true };
    } catch (error) {
      console.error('Error handling code update:', error);
      return { success: false, error: 'Failed to update code' };
    }
  }

  private async handleUserDisconnect(client: Socket) {
    try {
      const user = client.data.user;
      if (!user) {
        return;
      }

      // Get client info to find the session they were in
      const clientInfo = this.connectedClients.get(client.id);
      if (clientInfo?.sessionId) {
        await this.sessionsService.removeParticipant(
          clientInfo.sessionId,
          user.sub,
        );

        // Notify other users in the session
        this.server.to(clientInfo.sessionId).emit('userLeft', {
          userId: user.sub,
          firstName: user.firstName,
          lastName: user.lastName,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('Error handling user disconnect:', error);
    }
  }

  // Additional Socket.IO features
  @SubscribeMessage('getSessionInfo')
  async handleGetSessionInfo(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    try {
      const user = client.data.user;
      if (!user) {
        return { success: false, error: 'Authentication required' };
      }

      const { sessionId } = data;
      if (!sessionId) {
        return { success: false, error: 'Session ID is required' };
      }

      const session = await this.sessionsService.findSessionById(sessionId);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      const participants =
        await this.sessionsService.getActiveParticipants(sessionId);

      return {
        success: true,
        session: {
          id: (session as any)._id?.toString(),
          name: session.name,
          description: session.description,
          language: session.language,
          code: session.code,
          status: session.status,
          roomId: session.roomId,
          host: session.host,
          participantsCount: participants.length,
        },
        participants: participants.map((p) => ({
          id: p.user._id,
          firstName: p.user.firstName,
          lastName: p.user.lastName,
          email: p.user.email,
          cursorPosition: p.cursorPosition,
        })),
      };
    } catch (error) {
      console.error('Error getting session info:', error);
      return { success: false, error: 'Failed to get session info' };
    }
  }

  @SubscribeMessage('getConnectedClients')
  async handleGetConnectedClients(@ConnectedSocket() client: Socket) {
    try {
      const user = client.data.user;
      if (!user) {
        return { success: false, error: 'Authentication required' };
      }

      const connectedCount = this.server.engine.clientsCount;
      const roomCount = this.server.sockets.adapter.rooms.size;

      return {
        success: true,
        connectedClients: connectedCount,
        activeRooms: roomCount,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Error getting connected clients:', error);
      return { success: false, error: 'Failed to get connected clients' };
    }
  }
}
