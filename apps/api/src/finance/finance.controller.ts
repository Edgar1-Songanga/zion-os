import { Body, Controller, Get, Headers, Param, Patch, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { FinanceService } from './finance.service';

@Controller('v1/finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}
  private token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return token;
  }

  @Get('organizations/:organizationId/summary')
  summary(@Headers('authorization') authorization: string | undefined, @Param('organizationId') organizationId: string) {
    return this.finance.summary(this.token(authorization), organizationId);
  }

  @Post('organizations/:organizationId/contributions')
  createContribution(@Headers('authorization') authorization: string | undefined, @Param('organizationId') organizationId: string, @Body() body: Record<string, unknown>) {
    return this.finance.createContribution(this.token(authorization), organizationId, body);
  }

  @Get('organizations/:organizationId/my-contributions')
  memberContributions(@Headers('authorization') authorization: string | undefined, @Param('organizationId') organizationId: string) {
    return this.finance.memberContributions(this.token(authorization), organizationId);
  }

  @Post('organizations/:organizationId/my-contributions')
  submitMemberContribution(@Headers('authorization') authorization: string | undefined, @Param('organizationId') organizationId: string, @Body() body: { contribution_type: string; amount_minor: number; currency: string; payment_method: string; idempotency_key?: string }) {
    return this.finance.submitMemberContribution(this.token(authorization), organizationId, body);
  }

  @Post('webhooks/stripe')
  stripeWebhook(@Req() request: Request, @Headers('stripe-signature') signature?: string) {
    const rawBody = (request as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody || !signature) throw new UnauthorizedException('Stripe webhook body and signature are required');
    return this.finance.processStripeWebhook(rawBody, signature);
  }

  @Get('my-contributions/:contributionId/receipt')
  contributionReceipt(@Headers('authorization') authorization: string | undefined, @Param('contributionId') contributionId: string) {
    return this.finance.contributionReceipt(this.token(authorization), contributionId);
  }

  @Post('organizations/:organizationId/staff')
  createStaff(@Headers('authorization') authorization: string | undefined, @Param('organizationId') organizationId: string, @Body() body: Record<string, unknown>) {
    return this.finance.createStaff(this.token(authorization), organizationId, body);
  }

  @Post('organizations/:organizationId/payroll-runs')
  createPayrollRun(@Headers('authorization') authorization: string | undefined, @Param('organizationId') organizationId: string, @Body() body: { period_start: string; period_end: string; currency: string; deductions_minor?: number }) {
    return this.finance.createPayrollRun(this.token(authorization), organizationId, body);
  }

  @Get('payroll-runs/:runId/items')
  payrollItems(@Headers('authorization') authorization: string | undefined, @Param('runId') runId: string) {
    return this.finance.payrollItems(this.token(authorization), runId);
  }

  @Patch('payroll-runs/:runId/approve')
  approvePayroll(@Headers('authorization') authorization: string | undefined, @Param('runId') runId: string) {
    return this.finance.approvePayroll(this.token(authorization), runId);
  }

  @Patch('payroll-runs/:runId/settle')
  recordSettlement(@Headers('authorization') authorization: string | undefined, @Param('runId') runId: string, @Body() body: { external_reference: string }) {
    return this.finance.recordSettlement(this.token(authorization), runId, body.external_reference);
  }
}
