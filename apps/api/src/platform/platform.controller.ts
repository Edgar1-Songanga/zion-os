import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { PlatformService } from './platform.service';

@Controller('v1/platform')
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  private token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return token;
  }

  @Get('search') search(@Headers('authorization') authorization: string | undefined, @Query('q') query: string, @Query('type') type?: string, @Query('limit') limit?: string) {
    return this.platform.search(this.token(authorization), query, type, limit);
  }

  @Post('search/documents') upsertSearch(@Headers('authorization') authorization: string | undefined, @Body() body: any) {
    return this.platform.upsertSearchDocument(this.token(authorization), body);
  }

  @Post('events') publishEvent(@Headers('authorization') authorization: string | undefined, @Body() body: any) {
    return this.platform.publishEvent(this.token(authorization), body);
  }

  @Post('analytics') recordAnalytics(@Headers('authorization') authorization: string | undefined, @Body() body: any) {
    return this.platform.recordAnalytics(this.token(authorization), body);
  }

  @Get('analytics/summary') analyticsSummary(@Headers('authorization') authorization: string | undefined, @Query('event_name') eventName?: string, @Query('limit') limit?: string) {
    return this.platform.analyticsSummary(this.token(authorization), eventName, limit);
  }

  @Post('jobs') enqueueJob(@Headers('authorization') authorization: string | undefined, @Body() body: any) {
    return this.platform.enqueueJob(this.token(authorization), body);
  }

  @Get('jobs') listJobs(@Headers('authorization') authorization: string | undefined, @Query('status') status?: string, @Query('limit') limit?: string) {
    return this.platform.listJobs(this.token(authorization), status, limit);
  }

  @Post('jobs/:jobId/claim') claimJob(@Headers('authorization') authorization: string | undefined, @Param('jobId') jobId: string, @Body() body: { worker_id: string }) {
    return this.platform.claimJob(this.token(authorization), jobId, body.worker_id);
  }

  @Patch('jobs/:jobId/complete') completeJob(@Headers('authorization') authorization: string | undefined, @Param('jobId') jobId: string, @Body() body: { status: string; result?: unknown; error?: unknown }) {
    return this.platform.completeJob(this.token(authorization), jobId, body);
  }
}
