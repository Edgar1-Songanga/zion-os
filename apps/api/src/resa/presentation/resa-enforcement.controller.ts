import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { ResaEnforcementService } from '../application/resa-enforcement.service';

@Controller('v1/resa/moderation')
export class ResaEnforcementController {
  constructor(private readonly enforcement: ResaEnforcementService) {}
  private token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return token;
  }

  @Post('content/:contentId/actions')
  apply(@Headers('authorization') authorization: string | undefined, @Param('contentId') contentId: string, @Body() body: { action_type?: unknown; reason?: unknown }) {
    return this.enforcement.applyAction(this.token(authorization), contentId, body);
  }

  @Get('my-actions')
  myActions(@Headers('authorization') authorization?: string, @Query('limit') limit?: string) {
    return this.enforcement.myActions(this.token(authorization), Number(limit) || 50);
  }

  @Post('actions/:actionId/appeals')
  appeal(@Headers('authorization') authorization: string | undefined, @Param('actionId') actionId: string, @Body() body: { reason?: unknown; details?: unknown }) {
    return this.enforcement.appeal(this.token(authorization), actionId, body);
  }

  @Get('my-content-appeals')
  myAppeals(@Headers('authorization') authorization?: string, @Query('limit') limit?: string) {
    return this.enforcement.myAppeals(this.token(authorization), Number(limit) || 50);
  }

  @Get('content-appeals')
  queue(@Headers('authorization') authorization?: string, @Query('status') status?: string, @Query('limit') limit?: string) {
    return this.enforcement.queue(this.token(authorization), status || 'open', Number(limit) || 50);
  }

  @Patch('content-appeals/:appealId')
  decide(@Headers('authorization') authorization: string | undefined, @Param('appealId') appealId: string, @Body() body: { status: 'reviewing'|'upheld'|'overturned'; decision_note?: string }) {
    return this.enforcement.decide(this.token(authorization), appealId, body.status, body.decision_note);
  }

  @Get('my-account-sanctions')
  myAccountSanctions(@Headers('authorization') authorization?: string, @Query('limit') limit?: string) {
    return this.enforcement.myAccountSanctions(this.token(authorization), Number(limit) || 50);
  }

  @Get('account-sanctions')
  accountSanctionQueue(@Headers('authorization') authorization?: string, @Query('limit') limit?: string) {
    return this.enforcement.accountSanctionQueue(this.token(authorization), Number(limit) || 100);
  }

  @Post('account-sanctions')
  createAccountSanction(@Headers('authorization') authorization: string | undefined, @Body() body: { target_user_id?: unknown; restriction_type?: unknown; reason?: unknown; expires_at?: unknown }) {
    return this.enforcement.createAccountSanction(this.token(authorization), body);
  }

  @Patch('account-sanctions/:sanctionId/revoke')
  revokeAccountSanction(@Headers('authorization') authorization: string | undefined, @Param('sanctionId') sanctionId: string, @Body() body: { note?: unknown }) {
    return this.enforcement.revokeAccountSanction(this.token(authorization), sanctionId, body.note);
  }

  @Post('account-sanctions/:sanctionId/appeals')
  submitAccountSanctionAppeal(@Headers('authorization') authorization: string | undefined, @Param('sanctionId') sanctionId: string, @Body() body: { reason?: unknown; details?: unknown }) {
    return this.enforcement.submitAccountSanctionAppeal(this.token(authorization), sanctionId, body);
  }

  @Get('account-sanction-appeals')
  accountSanctionAppeals(@Headers('authorization') authorization?: string, @Query('status') status?: string, @Query('limit') limit?: string) {
    return this.enforcement.accountSanctionAppeals(this.token(authorization), status || 'open', Number(limit) || 100);
  }

  @Patch('account-sanction-appeals/:appealId')
  decideAccountSanctionAppeal(@Headers('authorization') authorization: string | undefined, @Param('appealId') appealId: string, @Body() body: { status: 'reviewing'|'upheld'|'overturned'; decision_note?: unknown }) {
    return this.enforcement.decideAccountSanctionAppeal(this.token(authorization), appealId, body.status, body.decision_note);
  }
}
