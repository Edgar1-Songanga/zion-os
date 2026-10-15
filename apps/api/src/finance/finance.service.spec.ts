import { BadRequestException } from '@nestjs/common';
import { IdentityService } from '../identity/application/identity.service';
import { SupabaseRestClient } from '../common/supabase/supabase-rest.client';
import { FinanceService } from './finance.service';

describe('FinanceService journal validation', () => {
  const organizationId = '00000000-0000-4000-8000-000000000001';
  const debitAccountId = '00000000-0000-4000-8000-000000000002';
  const creditAccountId = '00000000-0000-4000-8000-000000000003';
  const entryId = '00000000-0000-4000-8000-000000000004';
  let service: FinanceService;
  let getSpy: jest.SpyInstance;
  let rpcSpy: jest.SpyInstance;
  let identity: { getCurrentUser: jest.Mock };

  beforeEach(() => {
    identity = { getCurrentUser: jest.fn().mockResolvedValue({ id: '00000000-0000-4000-8000-000000000005' }) };
    service = new FinanceService(identity as unknown as IdentityService);
    getSpy = jest.spyOn(SupabaseRestClient.prototype, 'get').mockResolvedValue([
      { id: debitAccountId, currency_code: 'AOA', is_active: true },
      { id: creditAccountId, currency_code: 'AOA', is_active: true },
    ]);
    rpcSpy = jest.spyOn(SupabaseRestClient.prototype, 'rpc').mockResolvedValue({
      id: entryId,
      entry_number: 1,
      status: 'POSTED',
    });
  });

  afterEach(() => jest.restoreAllMocks());

  const balancedEntry = (entry_date: string) => ({
    description: 'Registo de teste',
    entry_date,
    lines: [
      { account_id: debitAccountId, debit: 1000, credit: 0 },
      { account_id: creditAccountId, debit: 0, credit: 1000 },
    ],
  });

  it('rejects impossible calendar dates instead of allowing JavaScript date normalization', async () => {
    await expect(service.createJournal('access-token', organizationId, balancedEntry('2026-02-31')))
      .rejects.toBeInstanceOf(BadRequestException);

    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('rejects malformed dates', async () => {
    await expect(service.createJournal('access-token', organizationId, balancedEntry('15-10-2026')))
      .rejects.toBeInstanceOf(BadRequestException);

    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('rejects unbalanced journal entries before querying accounts', async () => {
    const input = balancedEntry('2026-10-15');
    input.lines[1].credit = 999;

    await expect(service.createJournal('access-token', organizationId, input))
      .rejects.toBeInstanceOf(BadRequestException);

    expect(getSpy).not.toHaveBeenCalled();
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('accepts a real calendar date and delegates the balanced entry to the atomic database RPC', async () => {
    await service.createJournal('access-token', organizationId, balancedEntry('2026-10-15'));

    expect(rpcSpy).toHaveBeenCalledWith('create_finance_manual_journal_entry', 'access-token', {
      p_organization_id: organizationId,
      p_description: 'Registo de teste',
      p_entry_date: '2026-10-15',
      p_lines: [
        { account_id: debitAccountId, debit: 1000, credit: 0, description: null },
        { account_id: creditAccountId, debit: 0, credit: 1000, description: null },
      ],
    });
  });
});
