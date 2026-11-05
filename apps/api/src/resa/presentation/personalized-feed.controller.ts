import { BadRequestException, Body, Controller, Get, Headers, Param, Post, Query, UnauthorizedException } from '@nestjs/common';
import { ResaPersonalizedFeedService } from '../application/personalized-feed.service';

@Controller('v1/resa')
export class ResaPersonalizedFeedController {
  constructor(private readonly feed: ResaPersonalizedFeedService) {}

  private token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return token;
  }

  @Get('personalized-feed')
  getFeed(@Headers('authorization') authorization?: string, @Query('limit') limit?: string) {
    return this.feed.getFeed(this.token(authorization), Number(limit) || 30);
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
    return this.feed.recordImpression(this.token(authorization), contentId, duration, body.completed === true);
  }
}
