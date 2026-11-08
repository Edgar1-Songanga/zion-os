import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { ResaModerationAppealsService } from '../application/resa-moderation-appeals.service';

@Controller('v1/resa/moderation')
export class ResaModerationAppealsController {
  constructor(private readonly appeals: ResaModerationAppealsService) {}

  private token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return token;
  }

  @Get('my-reports')
  myReports(@Headers('authorization') authorization?: string, @Query('limit') limit?: string) {
    return this.appeals.myReports(this.token(authorization), Number(limit) || 50);
  }

  @Post('reports/:reportId/appeals')
  createAppeal(
    @Headers('authorization') authorization: string | undefined,
    @Param('reportId') reportId: string,
    @Body() body: { reason?: unknown; details?: unknown },
  ) {
    return this.appeals.createAppeal(this.token(authorization), reportId, body);
  }

  @Get('appeals')
  queue(@Headers('authorization') authorization?: string, @Query('status') status?: string, @Query('limit') limit?: string) {
    return this.appeals.queue(this.token(authorization), status || 'open', Number(limit) || 50);
  }

  @Patch('appeals/:appealId')
  decide(
    @Headers('authorization') authorization: string | undefined,
    @Param('appealId') appealId: string,
    @Body() body: { status: 'reviewing' | 'upheld' | 'overturned'; decision_note?: string },
  ) {
    return this.appeals.decide(this.token(authorization), appealId, body.status, body.decision_note);
  }
}
