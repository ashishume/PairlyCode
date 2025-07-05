import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { SessionsGateway } from './sessions.gateway';
import {
  Session,
  SessionParticipant,
  SessionSchema,
  SessionParticipantSchema,
} from './entities/session.entity';
import { UsersModule } from '../users/users.module';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Session.name, schema: SessionSchema },
      { name: SessionParticipant.name, schema: SessionParticipantSchema },
    ]),
    UsersModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [SessionsController],
  providers: [SessionsService, SessionsGateway, WsJwtGuard],
  exports: [SessionsService],
})
export class SessionsModule {}
