import { Body, Controller, Get, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { GovernanceService } from '../application/governance.service';

@Controller('v1/governance')
export class GovernanceController {
  constructor(private readonly gov: GovernanceService) {}

  private token(a?: string) {
    const t = a?.replace(/^Bearer\s+/i, '').trim();
    if (!t) throw new UnauthorizedException('Bearer token is required');
    return t;
  }

  @Get('organizations/:organizationId/councils')
  councils(@Headers('authorization') a: string | undefined, @Param('organizationId') o: string) {
    return this.gov.councils(this.token(a), o);
  }

  @Post('organizations/:organizationId/councils')
  createCouncil(@Headers('authorization') a: string | undefined, @Param('organizationId') o: string, @Body() b: any) {
    return this.gov.createCouncil(this.token(a), o, b);
  }

  @Get('councils/:councilId/members')
  councilMembers(@Headers('authorization') a: string | undefined, @Param('councilId') c: string) {
    return this.gov.councilMembers(this.token(a), c);
  }

  @Post('councils/:councilId/members')
  addCouncilMember(@Headers('authorization') a: string | undefined, @Param('councilId') c: string, @Body() b: { membership_id: string; member_role?: string; is_voting_member?: boolean }) {
    return this.gov.addCouncilMember(this.token(a), c, b.membership_id, b);
  }

  @Get('councils/:councilId/meetings')
  meetings(@Headers('authorization') a: string | undefined, @Param('councilId') c: string) {
    return this.gov.meetings(this.token(a), c);
  }

  @Post('councils/:councilId/meetings')
  createMeeting(@Headers('authorization') a: string | undefined, @Param('councilId') c: string, @Body() b: any) {
    return this.gov.createMeeting(this.token(a), c, b);
  }

  @Get('meetings/:meetingId/media/ice-config')
  iceConfig(@Headers('authorization') a: string | undefined, @Param('meetingId') m: string) {
    return this.gov.iceConfig(this.token(a), m);
  }

  @Get('meetings/:meetingId/room')
  room(@Headers('authorization') a: string | undefined, @Param('meetingId') m: string) {
    return this.gov.room(this.token(a), m);
  }

  @Post('meetings/:meetingId/room/open')
  openRoom(@Headers('authorization') a: string | undefined, @Param('meetingId') m: string) {
    return this.gov.openRoom(this.token(a), m);
  }

  @Post('meetings/:meetingId/room/close')
  closeRoom(@Headers('authorization') a: string | undefined, @Param('meetingId') m: string) {
    return this.gov.closeRoom(this.token(a), m);
  }

  @Get('meetings/:meetingId/room/events')
  roomEvents(@Headers('authorization') a: string | undefined, @Param('meetingId') m: string) {
    return this.gov.roomEvents(this.token(a), m);
  }

  @Post('meetings/:meetingId/room/events')
  recordRoomEvent(@Headers('authorization') a: string | undefined, @Param('meetingId') m: string, @Body() b: { event_type: string; payload?: unknown }) {
    return this.gov.recordRoomEvent(this.token(a), m, b.event_type, b.payload);
  }

  @Get('meetings/:meetingId/controls')
  controls(@Headers('authorization') a: string | undefined, @Param('meetingId') m: string) {
    return this.gov.controls(this.token(a), m);
  }

  @Post('meetings/:meetingId/controls/self')
  setSelfControl(@Headers('authorization') a: string | undefined, @Param('meetingId') m: string, @Body() b: any) {
    return this.gov.setSelfControl(this.token(a), m, b);
  }

  @Post('meetings/:meetingId/controls/:userId')
  moderateParticipant(@Headers('authorization') a: string | undefined, @Param('meetingId') m: string, @Param('userId') u: string, @Body() b: any) {
    return this.gov.moderateParticipant(this.token(a), m, u, b);
  }

  @Post('meetings/:meetingId/room/lock')
  lockRoom(@Headers('authorization') a: string | undefined, @Param('meetingId') m: string, @Body() b: { locked: boolean; reason?: string }) {
    return this.gov.lockRoom(this.token(a), m, b.locked, b.reason);
  }

  @Post('meetings/:meetingId/room/recording')
  prepareRecording(@Headers('authorization') a: string | undefined, @Param('meetingId') m: string, @Body() b: { enabled: boolean }) {
    return this.gov.prepareRecording(this.token(a), m, b.enabled);
  }

  @Get('meetings/:meetingId/chat')
  chat(@Headers('authorization') a: string | undefined, @Param('meetingId') m: string) {
    return this.gov.chat(this.token(a), m);
  }

  @Post('meetings/:meetingId/chat')
  sendChat(@Headers('authorization') a: string | undefined, @Param('meetingId') m: string, @Body() b: { body: string }) {
    return this.gov.sendChat(this.token(a), m, b.body);
  }

  @Post('meetings/:meetingId/start')
  startMeeting(@Headers('authorization') a: string | undefined, @Param('meetingId') m: string) {
    return this.gov.startMeeting(this.token(a), m);
  }

  @Post('meetings/:meetingId/end')
  endMeeting(@Headers('authorization') a: string | undefined, @Param('meetingId') m: string) {
    return this.gov.endMeeting(this.token(a), m);
  }

  @Get('meetings/:meetingId/participants')
  participants(@Headers('authorization') a: string | undefined, @Param('meetingId') m: string) {
    return this.gov.participants(this.token(a), m);
  }

  @Post('meetings/:meetingId/participants')
  addParticipant(@Headers('authorization') a: string | undefined, @Param('meetingId') m: string, @Body() b: any) {
    return this.gov.addParticipant(this.token(a), m, b);
  }

  @Post('meetings/:meetingId/presence')
  setPresence(@Headers('authorization') a: string | undefined, @Param('meetingId') m: string, @Body() b: { status: 'ACCEPTED' | 'PRESENT' | 'LEFT' | 'DECLINED' }) {
    return this.gov.setPresence(this.token(a), m, b.status);
  }

  @Get('meetings/:meetingId/agenda')
  agenda(@Headers('authorization') a: string | undefined, @Param('meetingId') m: string) {
    return this.gov.agenda(this.token(a), m);
  }

  @Post('meetings/:meetingId/agenda')
  addAgenda(@Headers('authorization') a: string | undefined, @Param('meetingId') m: string, @Body() b: any) {
    return this.gov.addAgenda(this.token(a), m, b);
  }

  @Get('meetings/:meetingId/motions')
  motions(@Headers('authorization') a: string | undefined, @Param('meetingId') m: string) {
    return this.gov.motions(this.token(a), m);
  }

  @Post('meetings/:meetingId/motions')
  createMotion(@Headers('authorization') a: string | undefined, @Param('meetingId') m: string, @Body() b: any) {
    return this.gov.createMotion(this.token(a), m, b);
  }

  @Post('motions/:motionId/votes')
  vote(@Headers('authorization') a: string | undefined, @Param('motionId') m: string, @Body() b: { council_member_id: string; choice: string }) {
    return this.gov.vote(this.token(a), m, b.council_member_id, b.choice);
  }

  @Post('motions/:motionId/decision')
  decide(@Headers('authorization') a: string | undefined, @Param('motionId') m: string, @Body() b: { outcome: string }) {
    return this.gov.decide(this.token(a), m, b.outcome);
  }

  @Get('meetings/:meetingId/minutes')
  minutes(@Headers('authorization') a: string | undefined, @Param('meetingId') m: string) {
    return this.gov.minutes(this.token(a), m);
  }

  @Post('meetings/:meetingId/minutes')
  saveMinutes(@Headers('authorization') a: string | undefined, @Param('meetingId') m: string, @Body() b: { content: string; status?: string }) {
    return this.gov.saveMinutes(this.token(a), m, b.content, b.status);
  }
}
