import { Body, Controller, Get, Headers, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { YouthService } from './youth.service';

@Controller('v1/youth')
export class YouthController {
  constructor(private readonly youth: YouthService) {}
  private token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return token;
  }

  @Get('organizations/:organizationId/overview')
  overview(@Headers('authorization') authorization: string | undefined, @Param('organizationId') organizationId: string) {
    return this.youth.overview(this.token(authorization), organizationId);
  }

  @Post('organizations/:organizationId/programs')
  createProgram(@Headers('authorization') authorization: string | undefined, @Param('organizationId') organizationId: string, @Body() body: { program_key: string; name: string; age_range: string; philosophy: string }) {
    return this.youth.createProgram(this.token(authorization), organizationId, body);
  }

  @Post('organizations/:organizationId/clubs')
  createClub(@Headers('authorization') authorization: string | undefined, @Param('organizationId') organizationId: string, @Body() body: { program_id: string; name: string; motto?: string; church_name?: string }) {
    return this.youth.createClub(this.token(authorization), organizationId, body);
  }

  @Post('organizations/:organizationId/members')
  createMember(@Headers('authorization') authorization: string | undefined, @Param('organizationId') organizationId: string, @Body() body: { user_id?: string; legal_name: string; date_of_birth?: string; guardian_user_id?: string; consent_status?: string }) {
    return this.youth.createMember(this.token(authorization), organizationId, body);
  }

  @Post('clubs/:clubId/members/:memberId')
  addClubMember(@Headers('authorization') authorization: string | undefined, @Param('clubId') clubId: string, @Param('memberId') memberId: string, @Body() body: { role?: string }) {
    return this.youth.addClubMember(this.token(authorization), clubId, memberId, body.role);
  }

  @Post('organizations/:organizationId/activities')
  createActivity(@Headers('authorization') authorization: string | undefined, @Param('organizationId') organizationId: string, @Body() body: { club_id: string; title: string; activity_type: string; scheduled_on: string; status?: string; participants_count?: number; service_hours?: number; spiritual_actions?: number; skills_completed?: number }) {
    return this.youth.createActivity(this.token(authorization), organizationId, body);
  }

  @Post('organizations/:organizationId/achievements')
  createAchievement(@Headers('authorization') authorization: string | undefined, @Param('organizationId') organizationId: string, @Body() body: { member_id: string; program_id: string; title: string; achievement_type?: string; achieved_on?: string }) {
    return this.youth.createAchievement(this.token(authorization), organizationId, body);
  }

  @Patch('achievements/:achievementId/verify')
  verifyAchievement(@Headers('authorization') authorization: string | undefined, @Param('achievementId') achievementId: string) {
    return this.youth.verifyAchievement(this.token(authorization), achievementId);
  }

  @Post('organizations/:organizationId/certificates')
  issueCertificate(@Headers('authorization') authorization: string | undefined, @Param('organizationId') organizationId: string, @Body() body: { member_id: string; program_id: string; title: string }) {
    return this.youth.issueCertificate(this.token(authorization), organizationId, body);
  }

  @Get('certificates/:code/verify')
  verifyCertificate(@Headers('authorization') authorization: string | undefined, @Param('code') code: string) {
    return this.youth.verifyCertificate(this.token(authorization), code);
  }
}
