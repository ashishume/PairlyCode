import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractTokenFromHeader(client);

      console.log('WsJwtGuard - Client ID:', client.id);
      console.log('WsJwtGuard - Token found:', !!token);

      if (!token) {
        throw new WsException('Authentication token not found');
      }

      try {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: this.configService.get('jwt.secret'),
        });
        console.log('WsJwtGuard - JWT payload:', payload);

        client.data.user = payload;
        console.log('WsJwtGuard - User set in client.data:', client.data.user);

        return true;
      } catch (jwtError) {
        console.error('WsJwtGuard - JWT verification failed:', jwtError);
        throw new WsException('Invalid JWT token');
      }
    } catch (error) {
      throw new WsException('Invalid token');
    }
  }

  private extractTokenFromHeader(client: Socket): string | undefined {
    const auth =
      client.handshake.auth.token || client.handshake.headers.authorization;

    if (!auth) {
      return undefined;
    }

    if (auth.startsWith('Bearer ')) {
      return auth.substring(7);
    }

    return auth;
  }
}
