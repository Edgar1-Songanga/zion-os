import { Body, Controller, Get, Headers, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { ChurchMemberBaptismsService } from '../application/church-member-baptisms.service';

type BaptismBody = {
  member_record_id?: string;
  baptism_date?: string;
  location?: string;
  congregation_name?: string;
  minister_name?: string;
  document_reference?: string | null;
  notes?: string | null;
  status?: string;
  validation_note?: string | null;
};

@Controller('v1/organizations/:organizationId/church-baptisms')
export class ChurchMemberBaptismsController {
  constructor(private readonly baptisms: ChurchMemberBaptismsService) {}

  private token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return token;
  }

  @Get()
  list(@Headers('authorization') authorization: string | undefined, @Param('organizationId') organizationId: string) {
    return this.baptisms.list(this.token(authorization), organizationId);
  }

  @Post()
  create(@Headers('authorization') authorization: string | undefined, @Param('organizationId') organizationId: string, @Body() body: BaptismBody) {
    return this.baptisms.create(this.token(authorization), organizationId, body);
  }

  @Patch(':baptismId')
  update(
    @Headers('authorization') authorization: string | undefined,
    @Param('organizationId') organizationId: string,
    @Param('baptismId') baptismId: string,
    @Body() body: BaptismBody,
  ) {
    return this.baptisms.update(this.token(authorization), organizationId, baptismId, body);
  }

  @Patch(':baptismId/decision')
  decide(
    @Headers('authorization') authorization: string | undefined,
    @Param('organizationId') organizationId: string,
    @Param('baptismId') baptismId: string,
    @Body() body: Pick<BaptismBody, 'status' | 'validation_note'>,
  ) {
    return this.baptisms.decide(this.token(authorization), organizationId, baptismId, body);
  }

  @Get(':baptismId/history')
  history(@Headers('authorization') authorization: string | undefined, @Param('organizationId') organizationId: string, @Param('baptismId') baptismId: string) {
    return this.baptisms.history(this.token(authorization), organizationId, baptismId);
  }
}
