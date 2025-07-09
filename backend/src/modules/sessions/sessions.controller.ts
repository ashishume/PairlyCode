import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SessionsService } from './sessions.service';
import { CreateSessionDto, UpdateSessionDto } from './dto/create-session.dto';
import { Session } from './entities/session.entity';

@ApiTags('sessions')
@Controller('sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new coding session' })
  @ApiResponse({
    status: 201,
    description: 'Session created successfully',
    type: Session,
  })
  async createSession(
    @Body() createSessionDto: CreateSessionDto,
    @Request() req,
  ): Promise<Session> {
    return this.sessionsService.createSession(createSessionDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active sessions' })
  @ApiResponse({
    status: 200,
    description: 'List of active sessions',
    type: [Session],
  })
  async findAllSessions(): Promise<Session[]> {
    return this.sessionsService.findAllSessions();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific session by ID' })
  @ApiResponse({ status: 200, description: 'Session details', type: Session })
  async findSessionById(@Param('id') id: string): Promise<Session> {
    return this.sessionsService.findSessionById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a session' })
  @ApiResponse({
    status: 200,
    description: 'Session updated successfully',
    type: Session,
  })
  async updateSession(
    @Param('id') id: string,
    @Body() updateSessionDto: UpdateSessionDto,
    @Request() req,
  ): Promise<Session> {
    return this.sessionsService.updateSession(id, updateSessionDto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'End a session' })
  @ApiResponse({ status: 200, description: 'Session ended successfully' })
  async endSession(@Param('id') id: string, @Request() req): Promise<void> {
    return this.sessionsService.endSession(id, req.user);
  }

  @Delete(':id/delete')
  @ApiOperation({ summary: 'Delete a session permanently' })
  @ApiResponse({ status: 200, description: 'Session deleted successfully' })
  async deleteSession(@Param('id') id: string, @Request() req): Promise<void> {
    return this.sessionsService.deleteSession(id, req.user);
  }
}
