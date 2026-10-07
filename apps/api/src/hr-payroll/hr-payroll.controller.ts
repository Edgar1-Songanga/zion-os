import { Body, Controller, Get, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { HrPayrollService } from './hr-payroll.service';

@Controller('v1/hr-payroll')
export class HrPayrollController {
  constructor(private readonly service: HrPayrollService) {}

  private token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return token;
  }

  @Get('organizations/:organizationId/employees')
  employees(@Headers('authorization') a: string | undefined, @Param('organizationId') id: string) {
    return this.service.listEmployees(this.token(a), id);
  }

  @Post('organizations/:organizationId/employees')
  createEmployee(@Headers('authorization') a: string | undefined, @Param('organizationId') id: string, @Body() body: Record<string, unknown>) {
    return this.service.createEmployee(this.token(a), id, body);
  }

  @Get('organizations/:organizationId/payroll/runs')
  payrollRuns(@Headers('authorization') a: string | undefined, @Param('organizationId') id: string) {
    return this.service.listPayrollRuns(this.token(a), id);
  }

  @Post('organizations/:organizationId/payroll/runs')
  createPayrollRun(@Headers('authorization') a: string | undefined, @Param('organizationId') id: string, @Body() body: { period_start: string; period_end: string; pay_date?: string }) {
    return this.service.createPayrollRun(this.token(a), id, body);
  }


  @Get('organizations/:organizationId/employees/:employeeId/contracts')
  contracts(@Headers('authorization') a: string | undefined, @Param('organizationId') id: string, @Param('employeeId') employeeId: string) {
    return this.service.listContracts(this.token(a), id, employeeId);
  }

  @Post('organizations/:organizationId/employees/:employeeId/contracts')
  createContract(@Headers('authorization') a: string | undefined, @Param('organizationId') id: string, @Param('employeeId') employeeId: string, @Body() body: Record<string, unknown>) {
    return this.service.createContract(this.token(a), id, employeeId, body);
  }

  @Get('organizations/:organizationId/leave')
  leave(@Headers('authorization') a: string | undefined, @Param('organizationId') id: string) {
    return this.service.listLeaveRequests(this.token(a), id);
  }

  @Post('organizations/:organizationId/employees/:employeeId/leave')
  createLeave(@Headers('authorization') a: string | undefined, @Param('organizationId') id: string, @Param('employeeId') employeeId: string, @Body() body: Record<string, unknown>) {
    return this.service.createLeaveRequest(this.token(a), id, employeeId, body);
  }

  @Post('organizations/:organizationId/leave/:leaveId/approve')
  approveLeave(@Headers('authorization') a: string | undefined, @Param('organizationId') id: string, @Param('leaveId') leaveId: string, @Body() body: { approved: boolean }) {
    return this.service.approveLeave(this.token(a), id, leaveId, body.approved !== false);
  }

  @Post('organizations/:organizationId/payroll/runs/:runId/approve')
  approvePayroll(@Headers('authorization') a: string | undefined, @Param('organizationId') id: string, @Param('runId') runId: string) {
    return this.service.approvePayroll(this.token(a), id, runId);
  }

  @Get('organizations/:organizationId/payroll/runs/:runId/items')
  payrollItems(@Headers('authorization') a: string | undefined, @Param('organizationId') id: string, @Param('runId') runId: string) {
    return this.service.listPayrollItems(this.token(a), id, runId);
  }

  @Post('organizations/:organizationId/payroll/runs/:runId/calculate')
  calculate(@Headers('authorization') a: string | undefined, @Param('organizationId') id: string, @Param('runId') runId: string) {
    return this.service.calculatePayroll(this.token(a), id, runId);
  }
}
