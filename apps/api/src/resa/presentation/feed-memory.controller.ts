import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, Post, Query, UnauthorizedException } from '@nestjs/common';
import { ResaFeedMemoryService } from '../application/feed-memory.service';

@Controller('v1/resa')
export class ResaFeedMemoryController {
  constructor(private readonly memory: ResaFeedMemoryService) {}

  private token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return token;
  }

  @Post('content/:contentId/impression')
  recordImpression(
    @Headers('authorization') authorization: string | undefined,
    @Param('contentId') contentId: string,
    @Body() body: { duration_ms?: number; completed?: boolean },
  ) {
    const duration = Number(body?.duration_ms);
    if (!Number.isFinite(duration) || duration < 1000 || duration > 300000) {
      throw new BadRequestException('duration_ms must be between 1000 and 300000');
    }
    return this.memory.recordImpression(this.token(authorization), contentId, duration, body.completed === true);
  }

  @Get('creator/analytics')
  creatorAnalytics(
    @Headers('authorization') authorization: string | undefined,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.memory.creatorAnalytics(this.token(authorization), from, to);
  }

  @Delete('feed-memory')
  resetMemory(@Headers('authorization') authorization?: string) {
    return this.memory.resetMemory(this.token(authorization));
  }
}
