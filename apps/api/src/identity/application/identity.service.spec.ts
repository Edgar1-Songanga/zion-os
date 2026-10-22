import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { getSupabaseUser } from '../infrastructure/supabase-auth.client';

jest.mock('../infrastructure/supabase-auth.client', () => ({
  getSupabaseUser: jest.fn(),
}));

const getUser = jest.mocked(getSupabaseUser);

describe('IdentityService privileged authorization', () => {
  let service: IdentityService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new IdentityService();
  });

  it('rejects missing or invalid sessions as unauthenticated', async () => {
    getUser.mockResolvedValue(null);

    await expect(service.requireGlobalAdmin('invalid-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an ordinary member', async () => {
    getUser.mockResolvedValue({
      id: 'member-1',
      email: 'member@example.invalid',
      app_metadata: { zion_global_role: 'member', zion_verified: false },
    });

    await expect(service.requireGlobalAdmin('member-token')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects an administrator role that is not verified', async () => {
    getUser.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.invalid',
      app_metadata: { zion_global_role: 'global_admin', zion_verified: false },
    });

    await expect(service.requireGlobalAdmin('unverified-admin-token')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('does not trust an administrator claim supplied only as editable user metadata', async () => {
    getUser.mockResolvedValue({
      id: 'forged-1',
      email: 'forged@example.invalid',
      user_metadata: { zion_global_role: 'global_admin', zion_verified: true },
    } as Awaited<ReturnType<typeof getSupabaseUser>>);

    await expect(service.requireGlobalAdmin('forged-token')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('accepts only a verified server-managed global administrator claim', async () => {
    getUser.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.invalid',
      app_metadata: { zion_global_role: 'global_admin', zion_verified: true },
    });

    await expect(service.requireGlobalAdmin('admin-token')).resolves.toEqual({
      id: 'admin-1',
      email: 'admin@example.invalid',
    });
  });
});
