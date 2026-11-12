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
});
