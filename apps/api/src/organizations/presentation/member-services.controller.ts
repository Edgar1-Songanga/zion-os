import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { MemberServicesService } from '../application/member-services.service';

@Controller('v1/member-services')
export class MemberServicesController {
  constructor(private readonly services: MemberServicesService) {}
  private token(authorization?: string) { const token = authorization?.replace(/^Bearer\s+/i, '').trim(); if (!token) throw new UnauthorizedException('Bearer token is required'); return token; }

  @Get('mine') mine(@Headers('authorization') authorization?: string) { return this.services.mine(this.token(authorization)); }
  @Get('inbox') inbox(@Headers('authorization') authorization: string | undefined, @Query('organization_id') organizationId?: string) { return this.services.inbox(this.token(authorization), organizationId ?? ''); }
  @Get(':requestId') get(@Headers('authorization') authorization: string | undefined, @Param('requestId') requestId: string) { return this.services.get(this.token(authorization), requestId); }
  @Post() create(@Headers('authorization') authorization: string | undefined, @Body() body: { organization_id: string; destination_organization_id?: string; service_type: 'MEMBERSHIP_TRANSFER' | 'RECOMMENDATION_LETTER' | 'CHILD_DEDICATION' | 'BAPTISM_REQUEST' | 'PASTORAL_VISIT' | 'GENERAL_SECRETARY_SERVICE'; subject: string; details?: Record<string, unknown>; applicant_notes?: string }) { return this.services.create(this.token(authorization), body); }
  @Patch(':requestId/status') updateStatus(@Headers('authorization') authorization: string | undefined, @Param('requestId') requestId: string, @Body() body: { status: 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED'; note?: string }) { return this.services.updateStatus(this.token(authorization), requestId, body.status, body.note); }
  @Post(':requestId/cancel') cancel(@Headers('authorization') authorization: string | undefined, @Param('requestId') requestId: string) { return this.services.cancel(this.token(authorization), requestId); }
}
