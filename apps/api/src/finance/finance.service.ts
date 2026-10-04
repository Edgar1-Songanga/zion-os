import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IdentityService } from '../identity/application/identity.service';
import { SupabaseRestClient } from '../common/supabase/supabase-rest.client';

@Injectable()
export class FinanceService {
  private readonly db = new SupabaseRestClient();
  constructor(private readonly identity: IdentityService) {}

  async summary(token: string, organizationId: string) {
    await this.identity.getCurrentUser(token);
    const [contributions, staff, payrollRuns] = await Promise.all([
      this.db.get<any[]>('finance_contributions', token, `?select=id,contribution_type,amount_minor,currency,status,occurred_on&organization_id=eq.${organizationId}&order=occurred_on.desc&limit=100`),
      this.db.get<any[]>('finance_staff', token, `?select=id,legal_name,employee_number,department,base_salary_minor,currency,payment_method,active&organization_id=eq.${organizationId}&order=legal_name.asc`),
      this.db.get<any[]>('finance_payroll_runs', token, `?select=id,period_start,period_end,currency,status,total_gross_minor,total_deductions_minor,total_net_minor,approved_at,paid_at,external_payment_reference&organization_id=eq.${organizationId}&order=period_end.desc&limit=30`),
    ]);
    return { contributions, staff, payrollRuns };
  }

  async createContribution(token: string, organizationId: string, input: any) {
    const user = await this.identity.getCurrentUser(token);
    const amount = Number(input.amount_minor);
    if (!Number.isInteger(amount) || amount <= 0) throw new BadRequestException('amount_minor must be a positive integer');
    if (!['DONATION', 'TITHE', 'OFFERING'].includes(input.contribution_type)) throw new BadRequestException('Invalid contribution_type');
    const rows = await this.db.post<any[]>('finance_contributions', token, {
      organization_id: organizationId,
      donor_user_id: input.donor_user_id ?? null,
      contribution_type: input.contribution_type,
      amount_minor: amount,
      currency: String(input.currency ?? '').toUpperCase(),
      payment_method: input.payment_method ?? 'OFFLINE',
      status: input.status ?? 'PENDING',
      occurred_on: input.occurred_on ?? new Date().toISOString().slice(0, 10),
      external_reference: input.external_reference ?? null,
      notes: input.notes ?? null,
      created_by: user.id,
    });
    return rows[0];
  }

  async createStaff(token: string, organizationId: string, input: any) {
    const user = await this.identity.getCurrentUser(token);
    if (!input.legal_name?.trim() || !input.employee_number?.trim()) throw new BadRequestException('legal_name and employee_number are required');
    const salary = Number(input.base_salary_minor);
    if (!Number.isInteger(salary) || salary < 0) throw new BadRequestException('base_salary_minor must be a non-negative integer');
    const rows = await this.db.post<any[]>('finance_staff', token, {
      organization_id: organizationId,
      user_id: input.user_id ?? null,
      legal_name: input.legal_name.trim(),
      employee_number: input.employee_number.trim(),
      department: input.department?.trim() || null,
      pay_frequency: input.pay_frequency ?? 'MONTHLY',
      base_salary_minor: salary,
      currency: String(input.currency ?? '').toUpperCase(),
      payment_method: input.payment_method ?? 'BANK_TRANSFER',
      payment_account_last4: input.payment_account_last4 ?? null,
      created_by: user.id,
    });
    return rows[0];
  }

  async createPayrollRun(token: string, organizationId: string, input: { period_start: string; period_end: string; currency: string; deductions_minor?: number }) {
    const user = await this.identity.getCurrentUser(token);
    if (!input.period_start || !input.period_end || input.period_end < input.period_start) throw new BadRequestException('A valid payroll period is required');
    const staff = await this.db.get<any[]>('finance_staff', token, `?select=id,base_salary_minor,currency&organization_id=eq.${organizationId}&active=eq.true&currency=eq.${String(input.currency).toUpperCase()}`);
    if (!staff.length) throw new BadRequestException('No active staff found for this currency');
    const deductions = Number(input.deductions_minor ?? 0);
    if (!Number.isInteger(deductions) || deductions < 0) throw new BadRequestException('deductions_minor must be a non-negative integer');
    const gross = staff.reduce((sum, member) => sum + Number(member.base_salary_minor), 0);
    if (deductions > gross) throw new BadRequestException('Deductions cannot exceed gross payroll');
    const runRows = await this.db.post<any[]>('finance_payroll_runs', token, {
      organization_id: organizationId,
      period_start: input.period_start,
      period_end: input.period_end,
      currency: String(input.currency).toUpperCase(),
      total_gross_minor: gross,
      total_deductions_minor: deductions,
      total_net_minor: gross - deductions,
      status: 'PENDING_APPROVAL',
      created_by: user.id,
    });
    const run = runRows[0];
    if (!run) throw new BadRequestException('Payroll run was not created');
    const perItemDeduction = Math.floor(deductions / staff.length);
    for (const member of staff) {
      await this.db.post('finance_payroll_items', token, {
        payroll_run_id: run.id,
        staff_id: member.id,
        gross_minor: Number(member.base_salary_minor),
        deductions_minor: perItemDeduction,
        status: 'PENDING',
        payslip_number: `ZION-${run.id.slice(0, 8).toUpperCase()}-${member.id.slice(0, 8).toUpperCase()}`,
      });
    }
    return run;
  }

  async payrollItems(token: string, runId: string) {
    await this.identity.getCurrentUser(token);
    return this.db.get<any[]>('finance_payroll_items', token, `?select=id,staff_id,gross_minor,deductions_minor,net_minor,status,payslip_number,paid_at,external_reference&payroll_run_id=eq.${runId}&order=payslip_number.asc`);
  }

  async approvePayroll(token: string, runId: string) {
    const user = await this.identity.getCurrentUser(token);
    const rows = await this.db.patch<any[]>('finance_payroll_runs', token, { status: 'APPROVED', approved_by: user.id, approved_at: new Date().toISOString() }, `?id=eq.${runId}&status=eq.PENDING_APPROVAL`);
    if (!rows[0]) throw new NotFoundException('Payroll run not found or not awaiting approval');
    await this.db.patch('finance_payroll_items', token, { status: 'APPROVED' }, `?payroll_run_id=eq.${runId}&status=eq.PENDING`);
    return rows[0];
  }

  async recordSettlement(token: string, runId: string, externalReference: string) {
    await this.identity.getCurrentUser(token);
    if (!externalReference?.trim()) throw new BadRequestException('external_reference is required to record settlement');
    const rows = await this.db.patch<any[]>('finance_payroll_runs', token, { status: 'PAID', paid_at: new Date().toISOString(), external_payment_reference: externalReference.trim() }, `?id=eq.${runId}&status=eq.APPROVED`);
    if (!rows[0]) throw new NotFoundException('Approved payroll run not found');
    await this.db.patch('finance_payroll_items', token, { status: 'PAID', paid_at: new Date().toISOString(), external_reference: externalReference.trim() }, `?payroll_run_id=eq.${runId}&status=eq.APPROVED`);
    return rows[0];
  }
}
