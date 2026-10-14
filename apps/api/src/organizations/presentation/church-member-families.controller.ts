import { Body, Controller, Get, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { ChurchMemberFamiliesService } from '../application/church-member-families.service';

type FamilyRelationshipBody = {
  member_record_id?: string;
  related_member_record_id?: string;
  relationship_type?: string;
  notes?: string | null;
};

@Controller('v1/organizations/:organizationId/church-member-families')
export class ChurchMemberFamiliesController {
  constructor(private readonly families: ChurchMemberFamiliesService) {}

  private token(authorization?: string) {
    const match = authorization?.match(/^Bearer\s+(\S+)\s*$/i);
    const token = match?.[1];
    if (!token) throw new UnauthorizedException('A valid Bearer token is required');
    return token;
  }

  @Get()
  list(
    @Headers('authorization') authorization: string | undefined,
    @Param('organizationId') organizationId: string,
  ) {
    return this.families.list(this.token(authorization), organizationId);
  }

  @Post()
  create(
    @Headers('authorization') authorization: string | undefined,
    @Param('organizationId') organizationId: string,
    @Body() body: FamilyRelationshipBody,
  ) {
    return this.families.create(this.token(authorization), organizationId, body);
  }
}
