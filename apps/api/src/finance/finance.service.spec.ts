import { BadRequestException } from '@nestjs/common';
import { IdentityService } from '../identity/application/identity.service';
import { SupabaseRestClient } from '../common/supabase/supabase-rest.client';
import { FinanceService } from './finance.service';

describe('FinanceService manual journal safeguards', () => {
  const organizationId = '00000000-0000-4000-8000-000000000001';
  const debitAccountId = '00000000-0000-4000-8000-000000000002';
  const creditAccountId = '00000000-0000-4000-8000-000000000003';
  let service: FinanceService;
  let getSpy: jest.SpyInstance;
  let rpcSpy: jest.SpyInstance;
  let identitySpy: jest.Mock;

  const balancedInput = (overrides: Record<string, unknown> = {}) => ({
    description: 'Donation received',
    entry_date: '2026-10-15',
    lines: [
      { account_id: debitAccountId, debit: 125.5, credit: 0 },
      { account_id: creditAccountId, debit: 0, credit: 125.5 },
    ],
    ...overrides,
  });

  beforeEach(() => {
    identitySpy = jest.fn().mockResolvedValue({ id: 'user-1' });
    service = new FinanceService({ getCurrentUser: identitySpy } as unknown as IdentityService);
    getSpy = jest.spyOn(SupabaseRestClient.prototype, 'get').mockResolvedValue([
      { id: debitAccountId, currency_code: 'AOA', is_active: true },
      { id: creditAccountId, currency_code: 'AOA', is_active: true },
    ]);
    rpcSpy = jest.spyOn(SupabaseRestClient.prototype, 'rpc').mockResolvedValue({ id: 'entry-1', status: 'POSTED' });
  });

  afterEach(() => jest.restoreAllMocks());

  it('rejects an impossible calendar date before any backend call', async () => {
    await expect(service.createJournal('access-token', organizationId, balancedInput({ entry_date: '2026-02-30' }) as never))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(getSpy).not.toHaveBeenCalled();
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('rejects descriptions shorter than the RPC contract before any backend call', async () => {
    await expect(service.createJournal('access-token', organizationId, balancedInput({ description: 'x' }) as never))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(getSpy).not.toHaveBeenCalled();
  });

  it('rejects descriptions longer than the RPC contract before any backend call', async () => {
    await expect(service.createJournal('access-token', organizationId, balancedInput({ description: 'x'.repeat(501) }) as never))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(getSpy).not.toHaveBeenCalled();
  });

  it('rejects an unbalanced journal before loading accounts', async () => {
    const lines = [
      { account_id: debitAccountId, debit: 125.5, credit: 0 },
      { account_id: creditAccountId, debit: 0, credit: 125.49 },
    ];
    await expect(service.createJournal('access-token', organizationId, balancedInput({ lines }) as never))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(getSpy).not.toHaveBeenCalled();
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('posts a balanced journal through the atomic RPC after validating active same-currency accounts', async () => {
    await expect(service.createJournal('access-token', organizationId, balancedInput() as never))
      .resolves.toEqual({ id: 'entry-1', status: 'POSTED' });
    expect(getSpy).toHaveBeenCalledWith(
      'finance_accounts',
      'access-token',
      expect.stringContaining(`organization_id=eq.${organizationId}`),
    );
    expect(identitySpy).toHaveBeenCalledWith('access-token');
    expect(rpcSpy).toHaveBeenCalledWith('create_finance_manual_journal_entry', 'access-token', expect.objectContaining({
      p_organization_id: organizationId,
      p_description: 'Donation received',
      p_entry_date: '2026-10-15',
      p_lines: expect.arrayContaining([
        expect.objectContaining({ account_id: debitAccountId, debit: 125.5, credit: 0 }),
        expect.objectContaining({ account_id: creditAccountId, debit: 0, credit: 125.5 }),
      ]),
    }));
  });

  it('rejects an inactive or out-of-organization account set without calling the RPC', async () => {
    getSpy.mockResolvedValueOnce([{ id: debitAccountId, currency_code: 'AOA', is_active: true }]);
    await expect(service.createJournal('access-token', organizationId, balancedInput() as never))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('rejects mixed currencies without calling the RPC', async () => {
    getSpy.mockResolvedValueOnce([
      { id: debitAccountId, currency_code: 'AOA', is_active: true },
      { id: creditAccountId, currency_code: 'EUR', is_active: true },
    ]);
    await expect(service.createJournal('access-token', organizationId, balancedInput() as never))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(rpcSpy).not.toHaveBeenCalled();
  });
});
