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
  changes: any[];
  version: number;
  code?: string;
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
    // console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    // console.log(`Client disconnected: ${client.id}`);
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
        // console.log('No sessionId provided in joinSession request');
        client.emit('error', { message: 'Session ID is required' });
        return;
      }

      // Join the session room
      await client.join(sessionId);
      console.log(`Client ${client.id} joined room ${sessionId}`);

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
      console.log(
        `User ${fullUser._id} added as participant to session ${sessionId}`,
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
      // console.log('Cursor update request:', { clientId: client.id, data });

      const user = client.data.user;
      if (!user) {
        // console.log('No user found for cursor update');
        return;
      }

      const { sessionId, position } = data;

      if (!sessionId) {
        // console.log('No sessionId provided in cursor update');
        return;
      }

      // Get full user data from database
      const fullUser = await this.usersService.findOne(user.sub);
      if (!fullUser) {
        // console.log('User not found in database for cursor update:', user.sub);
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

      // console.log('Broadcasting cursor update to room:', sessionId, cursorData);
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

      console.log('Received sessionId:', sessionId);
      console.log('SessionId type:', typeof sessionId);
      console.log('SessionId length:', sessionId?.length);

      if (!sessionId || sessionId.trim() === '') {
        console.log(
          'No sessionId provided in code change or sessionId is empty',
        );
        return;
      }

      // Get full user data from database
      const fullUser = await this.usersService.findOne(user.sub);
      if (!fullUser) {
        // console.log('User not found in database for code change:', user.sub);
        return;
      }

      // Get current session code to apply changes
      console.log('Looking for session with ID:', sessionId);
      const session = await this.sessionsService.findSessionById(sessionId);
      console.log('Session found:', session ? 'Yes' : 'No');
      console.log('Session object:', session);

      if (!session) {
        console.log('Session not found, cannot update code');
        return;
      }

      let updatedCode = session.code;
      console.log('Current session code:', updatedCode);
      console.log('Current session code length:', updatedCode?.length);

      // Apply the changes to the current code
      console.log('Changes received:', changes);
      console.log('Changes length:', changes?.length);
      console.log('Changes type:', typeof changes);

      if (changes && changes.length > 0) {
        console.log('Processing changes...');
        // Sort changes by position (line number, then column)
        const sortedChanges = [...changes].sort((a, b) => {
          if (a.range.startLineNumber !== b.range.startLineNumber) {
            return a.range.startLineNumber - b.range.startLineNumber;
          }
          return a.range.startColumn - b.range.startColumn;
        });

        // Apply changes in reverse order to maintain correct positions
        const lines = updatedCode.split('\n');
        for (let i = sortedChanges.length - 1; i >= 0; i--) {
          const change = sortedChanges[i];
          const { range, text } = change;

          // Convert Monaco editor positions to 0-based array indices
          const startLine = range.startLineNumber - 1;
          const endLine = range.endLineNumber - 1;
          const startCol = range.startColumn - 1;
          const endCol = range.endColumn - 1;

          // Split the text to insert
          const textLines = text.split('\n');

          if (startLine === endLine) {
            // Single line change
            const line = lines[startLine];
            const newLine =
              line.substring(0, startCol) + text + line.substring(endCol);
            lines[startLine] = newLine;
          } else {
            // Multi-line change
            const firstLine = lines[startLine];
            const lastLine = lines[endLine];
            const newFirstLine =
              firstLine.substring(0, startCol) + textLines[0];
            const newLastLine =
              textLines[textLines.length - 1] + lastLine.substring(endCol);

            // Replace the affected lines
            lines.splice(
              startLine,
              endLine - startLine + 1,
              newFirstLine,
              ...textLines.slice(1, -1),
              newLastLine,
            );
          }
        }

        updatedCode = lines.join('\n');

        console.log('Updated code after processing changes:', updatedCode);
      } else {
        console.log('No changes to process or changes array is empty');
      }

      console.log('Final updated code to save:', updatedCode);
      console.log('Final code length:', updatedCode?.length);
      // Update the session code in the database
      await this.sessionsService.updateSessionCode(sessionId, updatedCode);

      // Broadcast code changes to other users in the session
      const codeChangeData = {
        userId: fullUser._id.toString(), // Convert ObjectId to string
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        changes,
        version,
      };

      const roomClients = this.server.sockets.adapter.rooms.get(sessionId);
      console.log(
        'Broadcasting code change to room:',
        sessionId,
        'Room clients:',
        roomClients?.size || 0,
        codeChangeData,
      );
      client.to(sessionId).emit('codeChanged', codeChangeData);
    } catch (error) {
      console.error('Error handling code change:', error);
    }
  }

  @SubscribeMessage('ping')
  async handlePing(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { timestamp: number },
  ) {
    try {
      console.log('Ping received from client:', client.id, data);
      client.emit('pong', {
        timestamp: data.timestamp,
        serverTime: Date.now(),
      });
    } catch (error) {
      console.error('Error handling ping:', error);
    }
  }

  @SubscribeMessage('updateCode')
  async handleUpdateCode(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UpdateCodeData,
  ) {
    try {
      console.log('Update code request received:', {
        clientId: client.id,
        data: { ...data, code: data.code.substring(0, 100) + '...' },
      });

      const user = client.data.user;
      if (!user) {
        console.log('No user found for code update');
        return;
      }

      const { sessionId, code, userId } = data;
      console.log('Processing updateCode:', {
        sessionId,
        userId,
        codeLength: code.length,
      });
      if (!sessionId) {
        console.log('No sessionId provided in code update');
        return;
      }

      // Get full user data from database
      const fullUser = await this.usersService.findOne(userId);
      if (!fullUser) {
        // console.log('User not found in database for code update:', user.sub);
        return;
      }

      // Update the session code in the database
      await this.sessionsService.updateSessionCode(sessionId, code);

      console.log('Code update:', code);

      // Broadcast code update to other users in the session
      const codeUpdateData = {
        userId,
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        code,
      };

      console.log('Emitting codeUpdated event to room:', sessionId, {
        userId,
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        codeLength: code.length,
        roomClients:
          this.server.sockets.adapter.rooms.get(sessionId)?.size || 0,
      });
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
