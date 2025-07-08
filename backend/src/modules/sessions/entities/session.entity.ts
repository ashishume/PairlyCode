import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/entities/user.entity';

export enum SessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  ENDED = 'ended',
}

export type SessionDocument = Session & Document;
export type SessionParticipantDocument = SessionParticipant & Document;

@Schema({ timestamps: true })
export class Session {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  language: string;

  @Prop({ required: true })
  code: string;

  @Prop({ default: 0 })
  version: number;

  @Prop({ enum: SessionStatus, default: SessionStatus.ACTIVE })
  status: SessionStatus;

  @Prop()
  roomId: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  host: User;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  hostId: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'SessionParticipant' }] })
  participants: SessionParticipant[];
}

@Schema({ timestamps: true })
export class SessionParticipant {
  @Prop({ type: Types.ObjectId, ref: 'Session', required: true })
  session: Session;

  @Prop({ type: Types.ObjectId, ref: 'Session', required: true })
  sessionId: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ default: false })
  isActive: boolean;

  @Prop({ type: String, default: null })
  socketId: string | null;

  @Prop({ type: Object })
  cursorPosition: any;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
export const SessionParticipantSchema =
  SchemaFactory.createForClass(SessionParticipant);
