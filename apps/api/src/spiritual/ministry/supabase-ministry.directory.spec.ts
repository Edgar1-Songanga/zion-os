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
