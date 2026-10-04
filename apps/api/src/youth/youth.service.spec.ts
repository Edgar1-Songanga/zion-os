import { BadRequestException } from '@nestjs/common';
import { YouthService } from './youth.service';

describe('YouthService', () => {
  const identity = { getCurrentUser: jest.fn().mockResolvedValue({ id: 'user-1' }) };
  const db = { get: jest.fn(), post: jest.fn(), upsert: jest.fn(), patch: jest.fn() };
  let service: YouthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new YouthService(identity as never);
    (service as unknown as { db: typeof db }).db = db;
  });

  it('creates an organization-scoped club with the authenticated creator', async () => {
    db.post.mockResolvedValue([{ id: 'club-1', name: 'Monte Sinai' }]);
    await expect(service.createClub('token', 'org-1', { program_id: 'program-1', name: 'Monte Sinai' })).resolves.toEqual({ id: 'club-1', name: 'Monte Sinai' });
    expect(db.post).toHaveBeenCalledWith('youth_clubs', 'token', expect.objectContaining({ organization_id: 'org-1', program_id: 'program-1', created_by: 'user-1' }));
  });

  it('rejects clubs without a name before touching persistence', async () => {
    await expect(service.createClub('token', 'org-1', { program_id: 'program-1', name: '' })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.post).not.toHaveBeenCalled();
  });

  it('calculates live activity metrics from completed records', async () => {
    db.get
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ member_id: 'member-1', role: 'LEADER' }])
      .mockResolvedValueOnce([{ status: 'COMPLETED', participants_count: 12, service_hours: 4.5, spiritual_actions: 3, skills_completed: 2 }])
      .mockResolvedValueOnce([{ verified: true }])
      .mockResolvedValueOnce([{ status: 'VALID' }]);
    const result = await service.overview('token', 'org-1');
    expect(result.metrics).toMatchObject({ leaders: 1, participation: 12, serviceHours: 4.5, spiritualActions: 3, skillsCompleted: 2, verifiedAchievements: 1, validCertificates: 1 });
  });
});
