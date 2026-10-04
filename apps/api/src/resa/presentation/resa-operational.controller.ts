import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { ResaOperationalService } from '../application/resa-operational.service';

@Controller('v1/resa')
export class ResaOperationalController {
  constructor(private readonly operational: ResaOperationalService) {}

  private token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return token;
  }

  @Get('communities') communities(@Headers('authorization') authorization?: string, @Query('limit') limit?: string) {
    return this.operational.listCommunities(this.token(authorization), Number(limit) || 30);
  }

  @Post('communities') createCommunity(@Headers('authorization') authorization: string | undefined, @Body() body: any) {
    return this.operational.createCommunity(this.token(authorization), body);
  }

  @Post('communities/:communityId/join') joinCommunity(@Headers('authorization') authorization: string | undefined, @Param('communityId') communityId: string) {
    return this.operational.joinCommunity(this.token(authorization), communityId);
  }

  @Post('communities/:communityId/leave') leaveCommunity(@Headers('authorization') authorization: string | undefined, @Param('communityId') communityId: string) {
    return this.operational.leaveCommunity(this.token(authorization), communityId);
  }

  @Get('events') events(@Headers('authorization') authorization?: string, @Query('limit') limit?: string) {
    return this.operational.listEvents(this.token(authorization), Number(limit) || 30);
  }

  @Post('events') createEvent(@Headers('authorization') authorization: string | undefined, @Body() body: any) {
    return this.operational.createEvent(this.token(authorization), body);
  }

  @Post('events/:eventId/respond') respondToEvent(@Headers('authorization') authorization: string | undefined, @Param('eventId') eventId: string, @Body() body: { response: string }) {
    return this.operational.respondToEvent(this.token(authorization), eventId, body.response);
  }

  @Get('conversations') conversations(@Headers('authorization') authorization?: string) {
    return this.operational.listConversations(this.token(authorization));
  }

  @Post('conversations') createConversation(@Headers('authorization') authorization: string | undefined, @Body() body: { member_ids?: unknown[]; title?: unknown }) {
    return this.operational.createConversation(this.token(authorization), body.member_ids ?? [], body.title);
  }

  @Get('conversations/:conversationId/messages') messages(@Headers('authorization') authorization: string | undefined, @Param('conversationId') conversationId: string, @Query('limit') limit?: string) {
    return this.operational.listMessages(this.token(authorization), conversationId, Number(limit) || 50);
  }

  @Post('conversations/:conversationId/messages') sendMessage(@Headers('authorization') authorization: string | undefined, @Param('conversationId') conversationId: string, @Body() body: { body: string; parent_message_id?: string }) {
    return this.operational.sendMessage(this.token(authorization), conversationId, body.body, body.parent_message_id);
  }

  @Post('moderation/reports') report(@Headers('authorization') authorization: string | undefined, @Body() body: any) {
    return this.operational.report(this.token(authorization), body);
  }

  @Get('moderation/reports') moderationQueue(@Headers('authorization') authorization: string | undefined, @Query('status') status?: string, @Query('limit') limit?: string) {
    return this.operational.moderationQueue(this.token(authorization), status || 'open', Number(limit) || 50);
  }

  @Patch('moderation/reports/:reportId') moderateReport(@Headers('authorization') authorization: string | undefined, @Param('reportId') reportId: string, @Body() body: { status: 'reviewing' | 'resolved' | 'dismissed' }) {
    return this.operational.moderateReport(this.token(authorization), reportId, body.status);
  }

  @Get('search') search(@Headers('authorization') authorization: string | undefined, @Query('q') query: string, @Query('type') type?: string, @Query('limit') limit?: string) {
    return this.operational.search(this.token(authorization), query, type, Number(limit) || 30);
  }
}
