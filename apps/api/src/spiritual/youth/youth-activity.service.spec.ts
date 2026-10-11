import { BadRequestException } from '@nestjs/common';
import { YouthActivityService } from './youth-activity.service';
import type { IdentityService } from '../../identity/application/identity.service';

describe('YouthActivityService validation', () => {
  const identity = {
    getCurrentUser: jest.fn().mockResolvedValue({ id: '00000000-0000-4000-8000-000000000001' }),
  } as unknown as IdentityService;
  let service: YouthActivityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new YouthActivityService(identity);
  });

  it('rejects unsupported activity types before persistence', async () => {
    await expect(service.updateActivity('token', '00000000-0000-4000-8000-000000000002', {
      activity_type: 'party',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid participation states before persistence', async () => {
    await expect(service.updateParticipation(
      'token',
      '00000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000003',
      { status: 'MAYBE' },
    )).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid activity identifiers', async () => {
    await expect(service.listClubActivities('token', 'not-a-uuid')).rejects.toBeInstanceOf(BadRequestException);
  });
});
