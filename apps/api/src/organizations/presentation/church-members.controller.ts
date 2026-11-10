import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
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
  matched_member_record_id?: string | null;
};

@Controller('v1/organizations/:organizationId/church-members')
export class ChurchMembersController {
  constructor(private readonly members: ChurchMembersService) {}

  private token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return token;
  }

  @Get('identity-candidates')
  findIdentityCandidates(
    @Headers('authorization') authorization: string | undefined,
    @Param('organizationId') organizationId: string,
    @Query('firstName') firstName: string,
    @Query('lastName') lastName: string,
    @Query('birthDate') birthDate: string,
    @Query('gender') gender?: string,
  ) {
    return this.members.findIdentityCandidates(this.token(authorization), organizationId, {
      first_name: firstName,
      last_name: lastName,
      birth_date: birthDate,
      gender: gender || null,
    });
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

  @Delete(':memberId')
  remove(
    @Headers('authorization') authorization: string | undefined,
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.members.remove(this.token(authorization), organizationId, memberId);
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
