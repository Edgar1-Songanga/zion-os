import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IdentityService } from '../identity/application/identity.service';
import { SupabaseRestClient } from '../common/supabase/supabase-rest.client';
import { HrPayrollService } from './hr-payroll.service';

describe('HrPayrollService payroll operations', () => {
  const organizationId = '00000000-0000-4000-8000-000000000001';
  const runId = '00000000-0000-4000-8000-000000000002';
  let service: HrPayrollService;
  let getSpy: jest.SpyInstance;
  let patchSpy: jest.SpyInstance;
  let rpcSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new HrPayrollService({} as IdentityService);
    getSpy = jest.spyOn(SupabaseRestClient.prototype, 'get');
    patchSpy = jest.spyOn(SupabaseRestClient.prototype, 'patch').mockResolvedValue([]);
    rpcSpy = jest.spyOn(SupabaseRestClient.prototype, 'rpc').mockResolvedValue([
      { id: runId, status: 'APPROVED' },
    ]);
  });

  afterEach(() => jest.restoreAllMocks());

  it('rejects recalculation in REVIEW before loading employees or creating duplicate payroll items', async () => {
    getSpy.mockResolvedValueOnce([
      { id: runId, period_start: '2026-10-01', period_end: '2026-10-31', status: 'REVIEW' },
    ]);

    await expect(service.calculatePayroll('access-token', organizationId, runId))
      .rejects.toBeInstanceOf(BadRequestException);

    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(patchSpy).not.toHaveBeenCalled();
  });

  it('delegates approval to the database authorization boundary using the caller session', async () => {
    await expect(service.approvePayroll('access-token', organizationId, runId))
      .resolves.toEqual({ id: runId, status: 'APPROVED' });

    expect(rpcSpy).toHaveBeenCalledWith('approve_payroll_run', 'access-token', {
      p_organization_id: organizationId,
      p_run_id: runId,
    });
  });

  it('returns not found when the database reports no reviewable payroll run', async () => {
    rpcSpy.mockResolvedValue([]);
    await expect(service.approvePayroll('access-token', organizationId, runId))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks unsupported FORMULA components before moving the payroll run out of DRAFT', async () => {
    getSpy
      .mockResolvedValueOnce([
        { id: runId, period_start: '2026-10-01', period_end: '2026-10-31', status: 'DRAFT' },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: '00000000-0000-4000-8000-000000000003',
          code: 'CUSTOM_FORMULA',
          name: 'Custom formula',
          component_type: 'DEDUCTION',
          calculation_type: 'FORMULA',
          rate: null,
        },
      ]);

    await expect(service.calculatePayroll('access-token', organizationId, runId))
      .rejects.toThrow(/CUSTOM_FORMULA.*FORMULA/);

    expect(getSpy).toHaveBeenCalledTimes(4);
    expect(patchSpy).not.toHaveBeenCalled();
  });
  it('submits the complete payroll payload to one atomic database operation', async () => {
    getSpy
      .mockResolvedValueOnce([
        { id: runId, period_start: '2026-10-01', period_end: '2026-10-31', status: 'DRAFT' },
      ])
      .mockResolvedValueOnce([
        {
          id: '00000000-0000-4000-8000-000000000003',
          organization_id: organizationId,
          employee_number: 'EMP-001',
          legal_first_name: 'Ana',
          legal_last_name: 'Silva',
          employment_status: 'ACTIVE',
          job_title: 'Accountant',
          currency_code: 'AOA',
        },
      ])
      .mockResolvedValueOnce([
        { employee_id: '00000000-0000-4000-8000-000000000003', base_salary: 100000, currency_code: 'AOA' },
      ])
      .mockResolvedValueOnce([
        {
          id: '00000000-0000-4000-8000-000000000004',
          code: 'BONUS',
          name: 'Bonus',
          component_type: 'EARNING',
          calculation_type: 'FIXED',
          rate: 5000,
        },
      ]);
    rpcSpy.mockResolvedValueOnce([{
      id: runId,
      status: 'REVIEW',
      gross_total: 105000,
      deduction_total: 0,
      employer_contribution_total: 0,
      net_total: 105000,
    }]);

    await expect(service.calculatePayroll('access-token', organizationId, runId)).resolves.toMatchObject({
      id: runId,
      status: 'REVIEW',
      gross_total: 105000,
      net_total: 105000,
    });

    expect(rpcSpy).toHaveBeenCalledTimes(1);
    const [functionName, token, rawPayload] = rpcSpy.mock.calls[0];
    const payload = rawPayload as { p_organization_id: string; p_run_id: string; p_items: Array<Record<string, any>> };
    expect(functionName).toBe('calculate_payroll_run');
    expect(token).toBe('access-token');
    expect(payload.p_organization_id).toBe(organizationId);
    expect(payload.p_run_id).toBe(runId);
    expect(payload.p_items).toHaveLength(1);
    expect(payload.p_items[0]).toMatchObject({
      employee_id: '00000000-0000-4000-8000-000000000003',
      gross_amount: 105000,
      currency_code: 'AOA',
    });
    expect(payload.p_items[0].lines).toHaveLength(2);
    expect(patchSpy).not.toHaveBeenCalled();
  });

  it('does not attempt client-side recovery or partial writes when the atomic RPC fails', async () => {
    getSpy
      .mockResolvedValueOnce([
        { id: runId, period_start: '2026-10-01', period_end: '2026-10-31', status: 'DRAFT' },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    rpcSpy.mockRejectedValueOnce(new Error('transaction aborted'));

    await expect(service.calculatePayroll('access-token', organizationId, runId))
      .rejects.toThrow('transaction aborted');

    expect(rpcSpy).toHaveBeenCalledTimes(1);
    expect(patchSpy).not.toHaveBeenCalled();
  });

});
