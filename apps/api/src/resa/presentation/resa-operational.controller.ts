import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { ResaOperationalService } from '../application/resa-operational.service';
import { ResaLiveEgressService } from '../application/resa-live-egress.service';

@Controller('v1/resa')
export class ResaOperationalController {
  constructor(private readonly operational: ResaOperationalService, private readonly liveEgress: ResaLiveEgressService) {}

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

  @Get('prayer') prayer(@Headers('authorization') authorization?: string, @Query('limit') limit?: string) {
    return this.operational.listPrayerRequests(this.token(authorization), Number(limit) || 30);
  }

  @Post('prayer') createPrayer(@Headers('authorization') authorization: string | undefined, @Body() body: any) {
    return this.operational.createPrayerRequest(this.token(authorization), body);
  }

  @Post('prayer/:prayerId/intercede') intercede(@Headers('authorization') authorization: string | undefined, @Param('prayerId') prayerId: string) {
    return this.operational.intercedeForPrayer(this.token(authorization), prayerId);
  }

  @Delete('prayer/:prayerId/intercede') removeIntercession(@Headers('authorization') authorization: string | undefined, @Param('prayerId') prayerId: string) {
    return this.operational.removeIntercession(this.token(authorization), prayerId);
  }

  @Patch('prayer/:prayerId/answer') answerPrayer(@Headers('authorization') authorization: string | undefined, @Param('prayerId') prayerId: string) {
    return this.operational.answerPrayerRequest(this.token(authorization), prayerId);
  }

  @Get('live') live(@Headers('authorization') authorization?: string, @Query('limit') limit?: string) {
    return this.operational.listLiveSessions(this.token(authorization), Number(limit) || 30);
  }

  @Post('live') createLive(@Headers('authorization') authorization: string | undefined, @Body() body: any) {
    return this.operational.createLiveSession(this.token(authorization), body);
  }

  @Post('live/:liveId/join') liveJoinConfig(@Headers('authorization') authorization: string | undefined, @Param('liveId') liveId: string, @Body() body: { password?: string }) {
    return this.operational.liveJoinConfig(this.token(authorization), liveId, body?.password);
  }
  @Get('live/:liveId/messages')
  listLiveChatMessages(@Headers('authorization') authorization: string | undefined, @Param('liveId') liveId: string, @Query('limit') limit?: string) {
    return this.operational.listLiveChatMessages(this.token(authorization), liveId, Number(limit) || 100);
  }

  @Post('live/:liveId/messages')
  sendLiveChatMessage(@Headers('authorization') authorization: string | undefined, @Param('liveId') liveId: string, @Body() body: { body: string }) {
    return this.operational.sendLiveChatMessage(this.token(authorization), liveId, body.body);
  }

  @Post('calls/:callId/join') callJoinConfig(@Headers('authorization') authorization: string | undefined, @Param('callId') callId: string) {
    return this.operational.callJoinConfig(this.token(authorization), callId);
  }
  @Patch('live/:liveId/status') updateLiveStatus(@Headers('authorization') authorization: string | undefined, @Param('liveId') liveId: string, @Body() body: { status: 'scheduled' | 'live' | 'ended' }) {
    return this.operational.updateLiveStatus(this.token(authorization), liveId, body.status);
  }

  @Post('live/:liveId/stream')
  startExternalStream(@Headers('authorization') authorization: string | undefined, @Param('liveId') liveId: string, @Body() body: { streamUrl: string }) {
    return this.liveEgress.startExternalStream(this.token(authorization), liveId, body.streamUrl);
  }

  @Post('live/:liveId/stream/stop')
  stopExternalStream(@Headers('authorization') authorization: string | undefined, @Param('liveId') liveId: string, @Body() body: { egressId: string }) {
    return this.liveEgress.stopExternalStream(this.token(authorization), liveId, body.egressId);
  }

  @Get('live/:liveId/moderators')
  listLiveModerators(@Headers('authorization') authorization: string | undefined, @Param('liveId') liveId: string) {
    return this.operational.listLiveModerators(this.token(authorization), liveId);
  }

  @Post('live/:liveId/moderators')
  setLiveModerator(@Headers('authorization') authorization: string | undefined, @Param('liveId') liveId: string, @Body() body: { identity: string; enabled?: boolean }) {
    return this.operational.setLiveModerator(this.token(authorization), liveId, body.identity, body.enabled !== false);
  }

  @Delete('live/:liveId/moderators/:identity')
  removeLiveModerator(@Headers('authorization') authorization: string | undefined, @Param('liveId') liveId: string, @Param('identity') identity: string) {
    return this.operational.setLiveModerator(this.token(authorization), liveId, identity, false);
  }

  @Patch('live/:liveId/participants/:identity')
  moderateLiveParticipant(
    @Headers('authorization') authorization: string | undefined,
    @Param('liveId') liveId: string,
    @Param('identity') identity: string,
    @Body() body: { action: 'allow_speak' | 'revoke_speak' | 'remove' },
  ) {
    return this.operational.moderateLiveParticipant(this.token(authorization), liveId, identity, body.action);
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

  @Get('notifications') notifications(@Headers('authorization') authorization?: string, @Query('limit') limit?: string) {
    return this.operational.listNotifications(this.token(authorization), Number(limit) || 30);
  }

  @Patch('notifications/:notificationId/read') markNotificationRead(@Headers('authorization') authorization: string | undefined, @Param('notificationId') notificationId: string) {
    return this.operational.markNotificationRead(this.token(authorization), notificationId);
  }

  @Post('notifications/read-all') markNotificationsRead(@Headers('authorization') authorization: string | undefined) {
    return this.operational.markNotificationsRead(this.token(authorization));
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
