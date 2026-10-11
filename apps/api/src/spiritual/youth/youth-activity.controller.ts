import { Body, Controller, Get, Headers, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { YouthActivityService } from './youth-activity.service';

@Controller('v1/youth/activities')
export class YouthActivityController {
  constructor(private readonly activities: YouthActivityService) {}

  private token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required.');
    return token;
  }

  @Get('organization/:organizationId/report')
  report(@Headers('authorization') authorization: string | undefined, @Param('organizationId') organizationId: string) {
    return this.activities.report(this.token(authorization), organizationId);
  }

  @Get('clubs/:clubId')
  listClubActivities(@Headers('authorization') authorization: string | undefined, @Param('clubId') clubId: string) {
    return this.activities.listClubActivities(this.token(authorization), clubId);
  }

  @Post('clubs/:clubId')
  createActivity(
    @Headers('authorization') authorization: string | undefined,
    @Param('clubId') clubId: string,
    @Body() body: {
      title?: string; description?: string; activity_type?: string; starts_at?: string;
      ends_at?: string | null; location?: string; leader_user_id?: string | null;
    },
  ) {
    return this.activities.createActivity(this.token(authorization), clubId, body);
  }

  @Patch(':id')
  updateActivity(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Body() body: {
      title?: string; description?: string; activity_type?: string; starts_at?: string;
      ends_at?: string | null; location?: string; leader_user_id?: string | null; status?: string;
    },
  ) {
    return this.activities.updateActivity(this.token(authorization), id, body);
  }

  @Get(':activityId/participants')
  listParticipants(@Headers('authorization') authorization: string | undefined, @Param('activityId') activityId: string) {
    return this.activities.listParticipants(this.token(authorization), activityId);
  }

  @Post(':activityId/participants')
  registerParticipant(
    @Headers('authorization') authorization: string | undefined,
    @Param('activityId') activityId: string,
    @Body() body: { user_id?: string },
  ) {
    return this.activities.registerParticipant(this.token(authorization), activityId, body.user_id);
  }

  @Patch(':activityId/participants/:userId')
  updateParticipation(
    @Headers('authorization') authorization: string | undefined,
    @Param('activityId') activityId: string,
    @Param('userId') userId: string,
    @Body() body: { status?: string; notes?: string },
  ) {
    return this.activities.updateParticipation(this.token(authorization), activityId, userId, body);
  }
}
