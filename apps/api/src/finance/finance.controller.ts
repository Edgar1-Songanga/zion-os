import { Body, Controller, Get, Headers, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
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
