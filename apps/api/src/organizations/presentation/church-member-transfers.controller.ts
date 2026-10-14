import { Body, Controller, Get, Headers, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { ChurchMemberTransfersService } from '../application/church-member-transfers.service';

type TransferBody = {
  member_record_id?: string;
  destination_organization_id?: string;
  request_date?: string;
  reason?: string | null;
  document_reference?: string | null;
  status?: string;
  decision_note?: string | null;
};

@Controller('v1/organizations/:organizationId/church-member-transfers')
export class ChurchMemberTransfersController {
  constructor(private readonly transfers: ChurchMemberTransfersService) {}

  private token(authorization?: string) {
    const match = authorization?.match(/^Bearer\s+(.+)$/i);
    const token = match?.[1]?.trim();
    if (!token) throw new UnauthorizedException('A valid Bearer token is required');
    return token;
  }

  @Get()
  list(@Headers('authorization') authorization: string | undefined, @Param('organizationId') organizationId: string) {
    return this.transfers.list(this.token(authorization), organizationId);
  }

  @Post()
  create(@Headers('authorization') authorization: string | undefined, @Param('organizationId') organizationId: string, @Body() body: TransferBody) {
    return this.transfers.create(this.token(authorization), organizationId, body);
  }

  @Patch(':transferId/status')
  changeStatus(
    @Headers('authorization') authorization: string | undefined,
    @Param('organizationId') organizationId: string,
    @Param('transferId') transferId: string,
    @Body() body: Pick<TransferBody, 'status' | 'decision_note'>,
  ) {
    return this.transfers.changeStatus(this.token(authorization), organizationId, transferId, body);
  }

  @Get(':transferId/history')
  history(@Headers('authorization') authorization: string | undefined, @Param('organizationId') organizationId: string, @Param('transferId') transferId: string) {
    return this.transfers.history(this.token(authorization), organizationId, transferId);
  }
}
