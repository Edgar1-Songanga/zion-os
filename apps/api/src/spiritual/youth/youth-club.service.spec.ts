import { BadRequestException } from '@nestjs/common';
import { YouthClubService } from './youth-club.service';
import type { YouthClubDirectoryPort, YouthClubRecord } from './youth-club.types';

describe('YouthClubService', () => {
  const organizationId = '00000000-0000-4000-8000-000000000001';
  const clubId = '00000000-0000-4000-8000-000000000002';
  const record: YouthClubRecord = {
    id: clubId,
    organizationId,
    ministryId: null,
    name: 'Clube Monte Sinai',
    programId: 'pathfinders',
    motto: 'Salvar do pecado e guiar no serviço',
    description: 'Clube de Desbravadores',
    logoUrl: null,
    coverImageUrl: null,
    status: 'ACTIVE',
    createdAt: '2026-10-11T00:00:00.000Z',
    updatedAt: '2026-10-11T00:00:00.000Z',
  };

  let directory: jest.Mocked<YouthClubDirectoryPort>;
  let service: YouthClubService;

  beforeEach(() => {
    directory = {
      create: jest.fn().mockResolvedValue(record),
      getById: jest.fn().mockResolvedValue(record),
      listByOrganization: jest.fn().mockResolvedValue([record]),
      update: jest.fn().mockResolvedValue(record),
    };
    service = new YouthClubService(directory);
  });

  it('creates a normalized club using a supported Adventist youth program', async () => {
    await service.create('access-token', {
      organizationId,
      name: ' Clube Monte Sinai ',
      programId: 'pathfinders',
      motto: ' Salvar do pecado e guiar no serviço ',
      coverImageUrl: 'https://media.example.org/pathfinders.jpg',
    });

    expect(directory.create).toHaveBeenCalledWith({
      organizationId,
      name: 'Clube Monte Sinai',
      programId: 'pathfinders',
      motto: 'Salvar do pecado e guiar no serviço',
      description: '',
      coverImageUrl: 'https://media.example.org/pathfinders.jpg',
    }, 'access-token');
  });

  it('rejects unsupported programs and non-HTTPS media URLs', async () => {
    await expect(service.create('token', {
      organizationId,
      name: 'Clube Monte Sinai',
      programId: 'unregistered-program',
    })).rejects.toBeInstanceOf(BadRequestException);

    await expect(service.create('token', {
      organizationId,
      name: 'Clube Monte Sinai',
      programId: 'pathfinders',
      logoUrl: 'http://example.org/logo.png',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid identifiers and empty updates', async () => {
    await expect(service.get('not-a-uuid', 'token')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update(clubId, 'token', {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('supports safe updates without allowing an organization transfer', async () => {
    await service.update(clubId, 'token', {
      name: 'Clube Monte Sinai Renovado',
      status: 'INACTIVE',
    });

    expect(directory.update).toHaveBeenCalledWith(clubId, {
      name: 'Clube Monte Sinai Renovado',
      status: 'INACTIVE',
    }, 'token');
  });
});
