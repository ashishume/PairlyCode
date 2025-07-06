import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Session,
  SessionParticipant,
  SessionStatus,
  SessionDocument,
  SessionParticipantDocument,
} from './entities/session.entity';
import { CreateSessionDto, UpdateSessionDto } from './dto/create-session.dto';
import { User } from '../users/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(Session.name)
    private sessionModel: Model<SessionDocument>,
    @InjectModel(SessionParticipant.name)
    private participantModel: Model<SessionParticipantDocument>,
  ) {}

  async createSession(
    createSessionDto: CreateSessionDto,
    user: User,
  ): Promise<Session> {
    const session = new this.sessionModel({
      ...createSessionDto,
      host: user._id,
      hostId: user._id.toString(),
      roomId: uuidv4(),
    });

    const savedSession = await session.save();

    // Add host as participant
    await this.addParticipant(
      (savedSession as any)._id.toString(),
      user._id.toString(),
      null,
    );

    // Return populated session
    const populatedSession = await this.sessionModel
      .findById(savedSession._id)
      .populate('host')
      .populate({
        path: 'participants',
        populate: { path: 'user' },
      })
      .exec();

    if (!populatedSession) {
      throw new Error('Failed to create session');
    }

    return populatedSession;
  }

  async findAllSessions(): Promise<Session[]> {
    return this.sessionModel
      .find({ status: SessionStatus.ACTIVE })
      .populate('host')
      .populate({
        path: 'participants',
        populate: { path: 'user' },
      })
      .exec();
  }

  async findSessionById(id: string): Promise<Session> {
    const session = await this.sessionModel
      .findById(id)
      .populate('host')
      .populate({
        path: 'participants',
        populate: { path: 'user' },
      })
      .exec();

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async updateSession(
    id: string,
    updateSessionDto: UpdateSessionDto,
    user: User,
  ): Promise<Session> {
    const session = await this.findSessionById(id);

    if (session.hostId.toString() !== user._id.toString()) {
      throw new ForbiddenException('Only the host can update the session');
    }

    const updatedSession = await this.sessionModel
      .findByIdAndUpdate(id, updateSessionDto, { new: true })
      .populate('host')
      .populate({
        path: 'participants',
        populate: { path: 'user' },
      })
      .exec();

    if (!updatedSession) {
      throw new NotFoundException('Session not found');
    }

    return updatedSession;
  }

  async endSession(id: string, user: User): Promise<void> {
    const session = await this.findSessionById(id);

    if (session.hostId.toString() !== user._id.toString()) {
      throw new ForbiddenException('Only the host can end the session');
    }

    await this.sessionModel
      .findByIdAndUpdate(id, { status: SessionStatus.ENDED })
      .exec();
  }

  async addParticipant(
    sessionId: string,
    userId: string,
    socketId: string | null,
  ): Promise<SessionParticipant> {
    const existingParticipant = await this.participantModel.findOne({
      sessionId,
      userId,
    });

    if (existingParticipant) {
      existingParticipant.isActive = true;
      existingParticipant.socketId = socketId;
      return existingParticipant.save();
    }

    const participant = new this.participantModel({
      session: sessionId,
      sessionId,
      user: userId,
      userId,
      socketId,
      isActive: true,
    });

    return participant.save();
  }

  async removeParticipant(sessionId: string, userId: string): Promise<void> {
    const participant = await this.participantModel.findOne({
      sessionId,
      userId,
    });

    if (participant) {
      participant.isActive = false;
      participant.socketId = null;
      await participant.save();
    }
  }

  async updateCursorPosition(
    sessionId: string,
    userId: string,
    cursorPosition: any,
  ): Promise<void> {
    const participant = await this.participantModel.findOne({
      sessionId,
      userId,
    });

    if (participant) {
      participant.cursorPosition = cursorPosition;
      await participant.save();
    }
  }

  async updateSessionCode(sessionId: string, code: string): Promise<void> {
    // console.log('Service: Updating session code for sessionId:', sessionId);
    // console.log('Service: Code to save:', code);
    // console.log('Service: Code length:', code?.length);
    await this.sessionModel.findByIdAndUpdate(sessionId, { code }).exec();
    // console.log('Service: Code update completed');
  }

  async getActiveParticipants(
    sessionId: string,
  ): Promise<SessionParticipant[]> {
    return this.participantModel
      .find({ sessionId, isActive: true })
      .populate('user')
      .exec();
  }
}
