import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IdentityService } from '../identity/application/identity.service';
import { SupabaseRestClient } from '../common/supabase/supabase-rest.client';

type Employee = {
  id: string;
  organization_id: string;
  employee_number: string;
  legal_first_name: string;
  legal_last_name: string;
  preferred_name?: string | null;
  employment_status: string;
  job_title: string;
  currency_code: string;
};

type Contract = { employee_id: string; base_salary: number; currency_code: string };
type Component = {
  id: string;
  code: string;
  name: string;
  component_type: 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION';
  calculation_type: 'FIXED' | 'PERCENTAGE' | 'FORMULA';
  rate?: number | null;
};

@Injectable()
export class HrPayrollService {
  private readonly db = new SupabaseRestClient();
  constructor(private readonly identity: IdentityService) {}

  async listEmployees(accessToken: string, organizationId: string) {
    return this.db.get<Employee[]>('hr_employees', accessToken,
      `?select=id,organization_id,employee_number,legal_first_name,legal_last_name,preferred_name,employment_status,job_title,currency_code&organization_id=eq.${organizationId}&order=legal_last_name.asc,legal_first_name.asc`);
  }

  async createEmployee(accessToken: string, organizationId: string, input: Record<string, unknown>) {
    const user = await this.identity.getCurrentUser(accessToken);
    const required = ['employee_number', 'legal_first_name', 'legal_last_name', 'hire_date', 'job_title'];
    for (const key of required) if (!String(input[key] ?? '').trim()) throw new BadRequestException(`${key} is required`);
    const rows = await this.db.post<Employee[]>('hr_employees', accessToken, {
      organization_id: organizationId,
      employee_number: String(input.employee_number).trim(),
      legal_first_name: String(input.legal_first_name).trim(),
      legal_last_name: String(input.legal_last_name).trim(),
      preferred_name: input.preferred_name ?? null,
      user_id: input.user_id ?? null,
      hire_date: input.hire_date,
      job_title: String(input.job_title).trim(),
      employment_type: input.employment_type ?? 'FULL_TIME',
      country_code: input.country_code ?? 'AO',
      currency_code: input.currency_code ?? 'AOA',
      work_email: input.work_email ?? null,
      created_by: user.id,
    });
    if (!rows[0]) throw new BadRequestException('Employee was not created');
    return rows[0];
  }

  async listPayrollRuns(accessToken: string, organizationId: string) {
    return this.db.get('payroll_runs', accessToken,
      `?select=id,period_start,period_end,pay_date,status,gross_total,deduction_total,employer_contribution_total,net_total,currency_code,created_at&organization_id=eq.${organizationId}&order=period_end.desc`);
  }

  async listContracts(accessToken: string, organizationId: string, employeeId: string) {
    return this.db.get('hr_contracts', accessToken,
      `?select=id,employee_id,contract_number,contract_type,start_date,end_date,base_salary,currency_code,pay_frequency,probation_end_date,status,terms&employee_id=eq.${employeeId}&order=start_date.desc`);
  }

  async createContract(accessToken: string, organizationId: string, employeeId: string, input: Record<string, unknown>) {
    const user = await this.identity.getCurrentUser(accessToken);
    const employees = await this.db.get<Employee[]>('hr_employees', accessToken, `?select=id,organization_id&organization_id=eq.${organizationId}&id=eq.${employeeId}&limit=1`);
    if (!employees[0]) throw new NotFoundException('Employee not found');
    if (!input.contract_number || !input.contract_type || !input.start_date) throw new BadRequestException('contract_number, contract_type and start_date are required');
    const rows = await this.db.post<Array<{ id: string; employee_id: string }>>('hr_contracts', accessToken, { created_by: user.id, employee_id: employeeId, contract_number: String(input.contract_number).trim(), contract_type: String(input.contract_type).trim(), start_date: input.start_date, end_date: input.end_date ?? null, base_salary: Number(input.base_salary ?? 0), currency_code: input.currency_code ?? 'AOA', pay_frequency: input.pay_frequency ?? 'MONTHLY', probation_end_date: input.probation_end_date ?? null, status: input.status ?? 'ACTIVE', terms: input.terms ?? {} });
    return rows[0];
  }

  async listLeaveRequests(accessToken: string, organizationId: string) {
    return this.db.get('hr_leave_requests', accessToken,
      `?select=id,employee_id,leave_type,start_date,end_date,status,reason,approved_by,approved_at,created_at&order=start_date.desc`);
  }

  async createLeaveRequest(accessToken: string, organizationId: string, employeeId: string, input: Record<string, unknown>) {
    const employees = await this.db.get<Employee[]>('hr_employees', accessToken, `?select=id,organization_id&organization_id=eq.${organizationId}&id=eq.${employeeId}&limit=1`);
    if (!employees[0]) throw new NotFoundException('Employee not found');
    if (!input.leave_type || !input.start_date || !input.end_date) throw new BadRequestException('leave_type, start_date and end_date are required');
    const user = await this.identity.getCurrentUser(accessToken);
    return (await this.db.post<Array<{ id: string; employee_id: string }>>('hr_leave_requests', accessToken, { created_by: user.id, employee_id: employeeId, leave_type: input.leave_type, start_date: input.start_date, end_date: input.end_date, reason: input.reason ?? null, status: 'PENDING' }))[0];
  }

  async approveLeave(accessToken: string, organizationId: string, leaveId: string, approved: boolean) {
    const actor = await this.identity.getCurrentUser(accessToken);
    const rows = await this.db.patch<Array<{ id: string; employee_id: string; status: string }>>('hr_leave_requests', accessToken, { status: approved ? 'APPROVED' : 'REJECTED', approved_by: actor.id, approved_at: new Date().toISOString() }, `?id=eq.${leaveId}`);
    if (!rows[0]) throw new NotFoundException('Leave request not found');
    return rows[0];
  }

  async createPayrollRun(accessToken: string, organizationId: string, input: { period_start: string; period_end: string; pay_date?: string }) {
    if (!input.period_start || !input.period_end || input.period_end < input.period_start) throw new BadRequestException('Invalid payroll period');
    const user = await this.identity.getCurrentUser(accessToken);
    const rows = await this.db.post<Array<{ id: string }>>('payroll_runs', accessToken, {
      organization_id: organizationId,
      period_start: input.period_start,
      period_end: input.period_end,
      pay_date: input.pay_date ?? null,
      status: 'DRAFT',
      created_by: user.id,
    });
    if (!rows[0]) throw new BadRequestException('Payroll run was not created');
    return rows[0];
  }

  async approvePayroll(accessToken: string, organizationId: string, runId: string) {
    const actor = await this.identity.getCurrentUser(accessToken);
    const rows = await this.db.patch<Array<{ id: string; status: string }>>('payroll_runs', accessToken, { status: 'APPROVED', approved_by: actor.id, approved_at: new Date().toISOString() }, `?id=eq.${runId}&organization_id=eq.${organizationId}&status=eq.REVIEW`);
    if (!rows[0]) throw new NotFoundException('Payroll run is not in REVIEW or was not found');
    return rows[0];
  }

  async listPayrollItems(accessToken: string, organizationId: string, runId: string) {
    return this.db.get('payroll_items', accessToken,
      `?select=id,payroll_run_id,employee_id,gross_amount,deduction_amount,employer_contribution_amount,net_amount,currency_code,status,calculation_snapshot&payroll_run_id=eq.${runId}&order=created_at.asc`);
  }

  async calculatePayroll(accessToken: string, organizationId: string, runId: string) {
    const runs = await this.db.get<Array<{ id: string; period_start: string; period_end: string; status: string }>>(
      'payroll_runs', accessToken, `?select=id,period_start,period_end,status&organization_id=eq.${organizationId}&id=eq.${runId}&limit=1`);
    const run = runs[0];
    if (!run) throw new NotFoundException('Payroll run not found');
    if (!['DRAFT', 'REVIEW'].includes(run.status)) throw new BadRequestException('Payroll run cannot be recalculated in its current state');

    const employees = await this.db.get<Employee[]>('hr_employees', accessToken,
      `?select=id,organization_id,employee_number,legal_first_name,legal_last_name,preferred_name,employment_status,job_title,currency_code&organization_id=eq.${organizationId}&employment_status=eq.ACTIVE`);
    const contracts = await this.db.get<Contract[]>('hr_contracts', accessToken,
      '?select=employee_id,base_salary,currency_code&status=eq.ACTIVE');
    const components = await this.db.get<Component[]>('hr_payroll_components', accessToken,
      `?select=id,code,name,component_type,calculation_type,rate&organization_id=eq.${organizationId}&is_active=eq.true`);

    await this.db.patch('payroll_runs', accessToken, { status: 'CALCULATING' }, `?id=eq.${runId}&organization_id=eq.${organizationId}`);

    let grossTotal = 0, deductionTotal = 0, employerTotal = 0;
    for (const employee of employees) {
      const contract = contracts.find((item) => item.employee_id === employee.id);
      if (!contract) continue;
      const base = Number(contract.base_salary || 0);
      let gross = base;
      let deductions = 0;
      let employer = 0;
      const lines: Array<Record<string, unknown>> = [{
        component_id: null, line_type: 'EARNING', description: 'Base salary', amount: base, rate: null,
      }];

      for (const component of components) {
        const amount = component.calculation_type === 'FIXED'
          ? Number(component.rate || 0)
          : component.calculation_type === 'PERCENTAGE'
            ? base * Number(component.rate || 0) / 100
            : 0;
        if (amount <= 0) continue;
        if (component.component_type === 'EARNING') { gross += amount; lines.push({ component_id: component.id, line_type: 'EARNING', description: component.name, amount, rate: component.rate }); }
        if (component.component_type === 'DEDUCTION') { deductions += amount; lines.push({ component_id: component.id, line_type: 'DEDUCTION', description: component.name, amount, rate: component.rate }); }
        if (component.component_type === 'EMPLOYER_CONTRIBUTION') { employer += amount; lines.push({ component_id: component.id, line_type: 'EMPLOYER_CONTRIBUTION', description: component.name, amount, rate: component.rate }); }
      }

      const net = gross - deductions;
      const itemRows = await this.db.post<Array<{ id: string }>>('payroll_items', accessToken, {
        payroll_run_id: runId, employee_id: employee.id, gross_amount: gross,
        deduction_amount: deductions, employer_contribution_amount: employer, net_amount: net,
        currency_code: employee.currency_code || 'AOA',
        calculation_snapshot: { base_salary: base, period_start: run.period_start, period_end: run.period_end },
      });
      const item = itemRows[0];
      if (!item) continue;
      for (const line of lines) await this.db.post('payroll_item_lines', accessToken, { payroll_item_id: item.id, ...line });
      grossTotal += gross; deductionTotal += deductions; employerTotal += employer;
    }
    const netTotal = grossTotal - deductionTotal;
    return this.db.patch('payroll_runs', accessToken, {
      status: 'REVIEW', gross_total: grossTotal, deduction_total: deductionTotal,
      employer_contribution_total: employerTotal, net_total: netTotal,
    }, `?id=eq.${runId}&organization_id=eq.${organizationId}`);
  }
}
