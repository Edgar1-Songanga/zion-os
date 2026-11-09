import { SupabaseMinistryDirectory } from './supabase-ministry.directory';

describe('SupabaseMinistryDirectory program operations', () => {
  const ministryId = '00000000-0000-4000-8000-000000000001';
  const programId = '00000000-0000-4000-8000-000000000002';
  let directory: SupabaseMinistryDirectory;
  let db: any;

  beforeEach(() => {
    directory = new SupabaseMinistryDirectory();
    db = (directory as any).db;
  });

  it('returns only verified ministry assignments for the authenticated user', async () => {
    const get = jest.spyOn(db, 'get').mockImplementation(async (table: string) => {
      if (table === 'ministry_leaders') return [{ ministry_id: ministryId }];
      if (table === 'ministries') return [{ id: ministryId, organization_id: '00000000-0000-4000-8000-000000000003', name: 'Mordomia Cristã', department: 'stewardship', status: 'active' }];
      if (table === 'organizations') return [{ name: 'Igreja Local', organization_type: 'LOCAL_CHURCH' }];
      return [];
    });
    const records = await directory.listByLeader('00000000-0000-4000-8000-000000000004', 'user-access-token', 'stewardship');
    expect(get).toHaveBeenCalledWith('ministries', 'user-access-token', expect.stringContaining('department=eq.stewardship'));
    expect(get).toHaveBeenCalledWith('ministry_leaders', 'user-access-token', expect.stringContaining('verified=eq.true'));
    expect(records).toHaveLength(1);
    expect(records[0].department).toBe('stewardship');
  });

  it('creates an organization-scoped program and maps database dates to the API shape', async () => {
    const post = jest.spyOn(db, 'post').mockResolvedValue([{
      id: programId,
      name: 'Plano anual',
      description: 'Atividades do departamento',
      status: 'PLANNED',
      start_date: '2026-11-01',
      end_date: '2027-10-31',
    }]);

    const created = await directory.createProgram(ministryId, {
      name: 'Plano anual',
      description: 'Atividades do departamento',
      status: 'PLANNED',
      startDate: '2026-11-01',
      endDate: '2027-10-31',
    }, 'user-access-token');

    expect(post).toHaveBeenCalledWith('ministry_programs', 'user-access-token', {
      ministry_id: ministryId,
      name: 'Plano anual',
      description: 'Atividades do departamento',
      status: 'PLANNED',
      start_date: '2026-11-01',
      end_date: '2027-10-31',
    });
    expect(created).toEqual({
      id: programId,
      name: 'Plano anual',
      description: 'Atividades do departamento',
      status: 'PLANNED',
      startDate: '2026-11-01',
      endDate: '2027-10-31',
    });
  });

  it('scopes updates by both ministry id and program id', async () => {
    const patch = jest.spyOn(db, 'patch').mockResolvedValue([{
      id: programId,
      name: 'Plano revisto',
      description: null,
      status: 'ACTIVE',
      start_date: null,
      end_date: null,
    }]);

    await directory.updateProgram(ministryId, programId, { name: 'Plano revisto', status: 'ACTIVE' }, 'user-access-token');

    expect(patch).toHaveBeenCalledWith(
      'ministry_programs',
      'user-access-token',
      { name: 'Plano revisto', status: 'ACTIVE' },
      `?id=eq.${programId}&ministry_id=eq.${ministryId}`,
    );
  });
});
