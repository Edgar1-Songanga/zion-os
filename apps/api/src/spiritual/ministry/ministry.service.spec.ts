import { BadRequestException } from '@nestjs/common';
import { SpiritualMinistryService } from './ministry.service';
import type { MinistryDirectoryPort, MinistryRecord } from './ministry.types';

describe('SpiritualMinistryService ministry profile management', () => {
  const ministryId = '00000000-0000-4000-8000-000000000001';
  let directory: jest.Mocked<MinistryDirectoryPort>;
  let service: SpiritualMinistryService;

  beforeEach(() => {
    const record: MinistryRecord = {
      id: ministryId,
      organizationId: ministryId,
      name: 'Desbravadores',
      department: 'pathfinder-club',
      description: 'Formação e serviço',
      philosophy: 'Salvar do pecado e guiar no serviço.',
      status: 'active',
      focusAreas: ['Classes'],
      createdAt: '2026-10-11T00:00:00.000Z',
      leadership: [],
      programs: [],
      reports: [],
      metrics: { members: 0, leaders: 0, programs: 0, participation: 0, growth: 0, impact: 0 },
    };
    directory = {
      create: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(record),
      getById: jest.fn().mockResolvedValue(null),
      listByOrganization: jest.fn().mockResolvedValue([]),
    };
    service = new SpiritualMinistryService(directory);
  });

  it('preserves the original create contract when optional profile metadata is omitted', async () => {
    await service.create('access-token', {
      organization_id: ministryId,
      name: 'Ministério Jovem',
    });

    expect(directory.create).toHaveBeenCalledWith(
      ministryId,
      {
        name: 'Ministério Jovem',
        department: 'MINISTRY',
        philosophy: '',
        description: '',
      },
      'access-token',
    );
  });

  it('normalizes editable profile metadata before persistence', async () => {
    await service.update(ministryId, 'access-token', {
      cover_image_url: 'https://media.example.org/pathfinders.jpg',
      official_url: 'https://www.gcyouthministries.org/ministries/pathfinders/',
      focus_areas: [' Classes ', 'Specialidades', 'Classes'],
      age_range: null,
      source_label: 'Adventist Youth Ministries',
    });

    expect(directory.update).toHaveBeenCalledWith(
      ministryId,
      {
        coverImageUrl: 'https://media.example.org/pathfinders.jpg',
        officialUrl: 'https://www.gcyouthministries.org/ministries/pathfinders/',
        focusAreas: ['Classes', 'Specialidades'],
        ageRange: null,
        sourceLabel: 'Adventist Youth Ministries',
      },
      'access-token',
    );
  });

  it('rejects non-HTTPS profile image and official reference URLs', async () => {
    await expect(
      service.update(ministryId, 'access-token', { cover_image_url: 'http://example.org/image.jpg' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.update(ministryId, 'access-token', { official_url: 'javascript:alert(1)' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects malformed ministry ids and empty updates', async () => {
    await expect(service.update('not-a-uuid', 'access-token', { name: 'Updated name' }))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update(ministryId, 'access-token', {}))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects too many focus areas and oversized descriptions', async () => {
    await expect(
      service.update(ministryId, 'access-token', { focus_areas: Array.from({ length: 21 }, (_, i) => `Area ${i}`) }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.update(ministryId, 'access-token', { description: 'x'.repeat(2001) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
