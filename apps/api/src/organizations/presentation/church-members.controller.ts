import { Body, Controller, Get, Headers, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { ChurchMembersService } from '../application/church-members.service';

type MemberBody = {
  member_number?: string | null;
  first_name?: string;
  last_name?: string;
  birth_date?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  baptism_date?: string | null;
  membership_status?: string;
  joined_on?: string | null;
  notes?: string | null;
};

@Controller('v1/organizations/:organizationId/church-members')
export class ChurchMembersController {
  constructor(private readonly members: ChurchMembersService) {}

  private token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return token;
  }

  @Get()
  list(
    @Headers('authorization') authorization: string | undefined,
    @Param('organizationId') organizationId: string,
  ) {
    return this.members.list(this.token(authorization), organizationId);
  }

  @Post()
  create(
    @Headers('authorization') authorization: string | undefined,
    @Param('organizationId') organizationId: string,
    @Body() body: MemberBody,
  ) {
    return this.members.create(this.token(authorization), organizationId, body);
  }

  @Patch(':memberId')
  update(
    @Headers('authorization') authorization: string | undefined,
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
    @Body() body: MemberBody,
  ) {
    return this.members.update(this.token(authorization), organizationId, memberId, body);
  }

  @Get(':memberId/status-history')
  statusHistory(
    @Headers('authorization') authorization: string | undefined,
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.members.statusHistory(this.token(authorization), organizationId, memberId);
  }
}
