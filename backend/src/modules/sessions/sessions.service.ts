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

  async deleteSession(id: string, user: User): Promise<void> {
    const session = await this.findSessionById(id);

    if (session.hostId.toString() !== user._id.toString()) {
      throw new ForbiddenException('Only the host can delete the session');
    }

    // Delete all participants first
    await this.participantModel.deleteMany({ sessionId: id }).exec();

    // Delete the session
    await this.sessionModel.findByIdAndDelete(id).exec();
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
    await this.sessionModel.findByIdAndUpdate(sessionId, { code }).exec();
  }

  async applyCodeChanges(
    sessionId: string,
    changes: {
      range: {
        startLineNumber: number;
        startColumn: number;
        endLineNumber: number;
        endColumn: number;
      };
      text: string;
    }[],
    version: number,
  ): Promise<void> {
    const session = await this.sessionModel.findById(sessionId).exec();
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    let currentCode = session.code || '';
    const lines = currentCode.split('\n');

    // Apply changes in reverse order to maintain line/column positions
    const sortedChanges = changes.sort((a, b) => {
      if (a.range.startLineNumber !== b.range.startLineNumber) {
        return b.range.startLineNumber - a.range.startLineNumber;
      }
      return b.range.startColumn - a.range.startColumn;
    });

    for (const change of sortedChanges) {
      const { range, text } = change;
      const startLine = range.startLineNumber - 1; // Convert to 0-based
      const startCol = range.startColumn - 1; // Convert to 0-based
      const endLine = range.endLineNumber - 1; // Convert to 0-based
      const endCol = range.endColumn - 1; // Convert to 0-based

      // Ensure we don't go out of bounds
      if (startLine < 0 || startLine >= lines.length) {
        continue;
      }

      if (startLine === endLine) {
        // Single line change
        const line = lines[startLine];
        const before = line.substring(0, startCol);
        const after = line.substring(endCol);
        lines[startLine] = before + text + after;
      } else {
        // Multi-line change
        const startLineBefore = lines[startLine].substring(0, startCol);
        const endLineAfter =
          endLine < lines.length ? lines[endLine].substring(endCol) : '';

        const newText = startLineBefore + text + endLineAfter;
        const newLines = newText.split('\n');

        // Replace the range with new lines
        lines.splice(startLine, endLine - startLine + 1, ...newLines);
      }
    }

    const newCode = lines.join('\n');
    await this.sessionModel
      .findByIdAndUpdate(sessionId, {
        code: newCode,
        version: version,
      })
      .exec();
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
