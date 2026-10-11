import { BadRequestException } from '@nestjs/common';
import { YouthProgressionService } from './youth-progression.service';
import type { IdentityService } from '../../identity/application/identity.service';

describe('YouthProgressionService validation', () => {
  const identity = {
    getCurrentUser: jest.fn().mockResolvedValue({ id: '00000000-0000-4000-8000-000000000001' }),
  } as unknown as IdentityService;
  let service: YouthProgressionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new YouthProgressionService(identity);
  });

  it('rejects unknown youth program IDs before attempting persistence', async () => {
    await expect(service.createCatalog('token', '00000000-0000-4000-8000-000000000002', {
      program_id: 'made-up-program',
      kind: 'CLASS',
      code: 'CLASS-01',
      name: 'Classe de teste',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unsupported catalog kinds', async () => {
    await expect(service.createCatalog('token', '00000000-0000-4000-8000-000000000002', {
      program_id: 'pathfinders',
      kind: 'AWARD',
      code: 'AWARD-01',
      name: 'Reconhecimento',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires HTTPS for official curriculum references', async () => {
    await expect(service.createCatalog('token', '00000000-0000-4000-8000-000000000002', {
      program_id: 'pathfinders',
      kind: 'SPECIALTY',
      code: 'NATURE-01',
      name: 'Especialidade de teste',
      official_reference_url: 'http://example.org/curriculum',
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});
