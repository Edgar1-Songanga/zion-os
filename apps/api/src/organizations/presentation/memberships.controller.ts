import { Body, Controller, Get, Headers, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { MembershipsService } from '../application/memberships.service';

@Controller('v1/organizations/:organizationId/memberships')
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  private token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return token;
  }

  @Get()
  list(@Headers('authorization') authorization: string | undefined, @Param('organizationId') organizationId: string) {
    return this.memberships.list(this.token(authorization), organizationId);
  }

  @Post()
  add(
    @Headers('authorization') authorization: string | undefined,
    @Param('organizationId') organizationId: string,
    @Body() body: { user_id: string; role_id?: string; status?: string },
  ) {
    return this.memberships.add(this.token(authorization), organizationId, body);
  }

  @Patch(':membershipId')
  update(
    @Headers('authorization') authorization: string | undefined,
    @Param('organizationId') organizationId: string,
    @Param('membershipId') membershipId: string,
    @Body() body: { role_id?: string; status?: string },
  ) {
    return this.memberships.update(this.token(authorization), organizationId, membershipId, body);
  }

  @Post(':membershipId/units/:unitId')
  assignUnit(
    @Headers('authorization') authorization: string | undefined,
    @Param('organizationId') organizationId: string,
    @Param('membershipId') membershipId: string,
    @Param('unitId') unitId: string,
  ) {
    return this.memberships.assignUnit(this.token(authorization), organizationId, membershipId, unitId);
  }

  @Patch(':membershipId/units/:unitId')
  removeUnit(
    @Headers('authorization') authorization: string | undefined,
    @Param('organizationId') organizationId: string,
    @Param('membershipId') membershipId: string,
    @Param('unitId') unitId: string,
  ) {
    return this.memberships.removeUnit(this.token(authorization), organizationId, membershipId, unitId);
  }
}
