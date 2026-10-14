import { UnauthorizedException } from '@nestjs/common';
import { IdentityController } from './identity.controller';
import { IdentityService } from '../application/identity.service';

describe('IdentityController bearer token parsing', () => {
  const identityService = { getCurrentUser: jest.fn() } as unknown as IdentityService;
  const controller = new IdentityController(identityService);

  beforeEach(() => jest.clearAllMocks());

  it('extracts a standard bearer token with case-insensitive scheme and whitespace', async () => {
    identityService.getCurrentUser = jest.fn().mockResolvedValue({ id: 'user-id' });
    await controller.me('Bearer access-token');
    expect(identityService.getCurrentUser).toHaveBeenCalledWith('access-token');
    await controller.me('bearer   second-token  ');
    expect(identityService.getCurrentUser).toHaveBeenCalledWith('second-token');
  });

  it('rejects missing or malformed authorization headers', async () => {
    await expect(controller.me(undefined)).rejects.toThrow(UnauthorizedException);
    await expect(controller.me('Basic access-token')).rejects.toThrow(UnauthorizedException);
    await expect(controller.me('Bearer')).rejects.toThrow(UnauthorizedException);
  });
});
