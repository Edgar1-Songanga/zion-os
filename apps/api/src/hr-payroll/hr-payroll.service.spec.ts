import { BadRequestException } from '@nestjs/common';
import { IdentityService } from '../identity/application/identity.service';
import { SupabaseRestClient } from '../common/supabase/supabase-rest.client';
import { HrPayrollService } from './hr-payroll.service';

describe('HrPayrollService payroll calculation state', () => {
  const organizationId = '00000000-0000-4000-8000-000000000001';
  const runId = '00000000-0000-4000-8000-000000000002';
  let service: HrPayrollService;
  let getSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new HrPayrollService({} as IdentityService);
    getSpy = jest.spyOn(SupabaseRestClient.prototype, 'get').mockResolvedValue([
      { id: runId, period_start: '2026-10-01', period_end: '2026-10-31', status: 'REVIEW' },
    ]);
  });

  afterEach(() => jest.restoreAllMocks());

  it('rejects recalculation in REVIEW before loading employees or creating duplicate payroll items', async () => {
    await expect(service.calculatePayroll('access-token', organizationId, runId))
      .rejects.toBeInstanceOf(BadRequestException);

    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledWith(
      'payroll_runs',
      'access-token',
      expect.stringContaining(`organization_id=eq.${organizationId}`),
    );
  });
});
