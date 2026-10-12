import { Body, Controller, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { MembershipTransferService } from '../application/membership-transfer.service';

@Controller('v1/membership-transfers')
export class MembershipTransferController {
  constructor(private readonly transfers: MembershipTransferService) {}
  private token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return token;
  }

  @Post()
  request(@Headers('authorization') authorization: string | undefined,
    @Body() body: { membership_id: string; destination_organization_id: string; reason?: string }) {
    return this.transfers.request(this.token(authorization), body);
  }

  @Post(':requestId/decision')
  decide(@Headers('authorization') authorization: string | undefined, @Param('requestId') requestId: string,
    @Body() body: { decision: string; note?: string }) {
    return this.transfers.decide(this.token(authorization), requestId, body);
  }

  @Post('discipline/:caseId/lift')
  liftDiscipline(@Headers('authorization') authorization: string | undefined, @Param('caseId') caseId: string,
    @Body() body: { vote_number: string; minutes_reference: string; decision_date: string; authority: string; note?: string }) {
    return this.transfers.liftDiscipline(this.token(authorization), caseId, body);
  }
}
