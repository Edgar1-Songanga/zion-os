import { BadRequestException } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';
import { ChurchMembersService } from './church-members.service';

describe('ChurchMembersService', () => {
  const accessToken = 'test-access-token';
  const organizationId = 'd8c1d6c7-7db3-4e5a-9f6c-6edc8f98d5c2';
  const memberId = 'a8f76a77-8d8d-47b4-9a6e-4e6dbac1d3bb';
  const actor = { id: '7c85f8ce-9d2a-4ed9-9cc5-1c43f1f9b4d1' };
  let service: ChurchMembersService;
  let getSpy: jest.SpyInstance;
  let postSpy: jest.SpyInstance;
  let patchSpy: jest.SpyInstance;
  let rpcSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.restoreAllMocks();
    const identity = { getCurrentUser: jest.fn().mockResolvedValue(actor) } as unknown as IdentityService;
    service = new ChurchMembersService(identity);
    getSpy = jest.spyOn(SupabaseRestClient.prototype, 'get').mockResolvedValue([] as never);
    postSpy = jest.spyOn(SupabaseRestClient.prototype, 'post').mockResolvedValue([] as never);
    patchSpy = jest.spyOn(SupabaseRestClient.prototype, 'patch').mockResolvedValue([] as never);
    rpcSpy = jest.spyOn(SupabaseRestClient.prototype, 'rpc').mockResolvedValue([] as never);
  });

  it('lists only records in the requested organization and requires an authenticated identity', async () => {
    await service.list(accessToken, organizationId);
    expect(getSpy).toHaveBeenCalledWith(
      'church_member_records',
      accessToken,
      expect.stringContaining(`organization_id=eq.${organizationId}`),
    );
  });

  it('searches cross-church identity candidates through the permission-scoped RPC', async () => {
    await service.findIdentityCandidates(accessToken, organizationId, {
      first_name: ' Ana ',
      last_name: ' Silva ',
      birth_date: '1990-05-12',
      gender: 'FEMALE',
    });
    expect(rpcSpy).toHaveBeenCalledWith('find_zion_member_identity_candidates', accessToken, {
      p_organization_id: organizationId,
      p_first_name: 'Ana',
      p_last_name: 'Silva',
      p_birth_date: '1990-05-12',
      p_gender: 'FEMALE',
    });
  });

  it('rejects invalid candidate search dates before calling the database', async () => {
    await expect(service.findIdentityCandidates(accessToken, organizationId, {
      first_name: 'Ana',
      last_name: 'Silva',
      birth_date: '2026-02-31',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('rejects incomplete candidate search data before calling the database', async () => {
    await expect(service.findIdentityCandidates(accessToken, organizationId, {
      first_name: 'Ana',
      last_name: ' ',
      birth_date: '1990-05-12',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('creates a member with normalized fields and server-derived audit identities', async () => {
    postSpy.mockResolvedValueOnce([{ id: memberId, first_name: 'Ana', last_name: 'Silva' }] as never);
    await service.create(accessToken, organizationId, { first_name: ' Ana ', last_name: ' Silva ', membership_status: 'ACTIVE' });
    expect(postSpy).toHaveBeenCalledWith(
      'church_member_records',
      accessToken,
      expect.objectContaining({
        organization_id: organizationId,
        first_name: 'Ana',
        last_name: 'Silva',
        created_by: actor.id,
        updated_by: actor.id,
      }),
    );
  });

  it('archives a member as REMOVED instead of hard-deleting the record', async () => {
    patchSpy.mockResolvedValueOnce([{ id: memberId, membership_status: 'REMOVED' }] as never);
    const result = await service.remove(accessToken, organizationId, memberId);
    expect(result.membership_status).toBe('REMOVED');
    expect(patchSpy).toHaveBeenCalledWith(
      'church_member_records',
      accessToken,
      { membership_status: 'REMOVED', updated_by: actor.id },
      `?id=eq.${memberId}&organization_id=eq.${organizationId}`,
    );
  });

  it('lists deceased and removed records across only RLS-authorized organizations', async () => {
    await service.listByStatus(accessToken, 'DECEASED');
    expect(getSpy).toHaveBeenCalledWith(
      'church_member_records',
      accessToken,
      expect.stringContaining('membership_status=eq.DECEASED'),
    );
  });

  it('rejects global member register filters outside deceased and removed states', async () => {
    await expect(service.listByStatus(accessToken, 'ACTIVE')).rejects.toBeInstanceOf(BadRequestException);
    expect(getSpy).not.toHaveBeenCalled();
  });

  it('prevents direct status edits from bypassing the audited removal workflow', async () => {
    await expect(service.update(accessToken, organizationId, memberId, {
      membership_status: 'REMOVED',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(patchSpy).not.toHaveBeenCalled();
  });

  it('rejects an empty required name before writing to the database', async () => {
    await expect(service.create(accessToken, organizationId, { first_name: ' ', last_name: 'Silva' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('rejects impossible calendar dates before writing to the database', async () => {
    await expect(service.create(accessToken, organizationId, {
      first_name: 'Ana',
      last_name: 'Silva',
      birth_date: '2026-02-31',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('rejects unsupported membership states', async () => {
    await expect(service.create(accessToken, organizationId, {
      first_name: 'Ana',
      last_name: 'Silva',
      membership_status: 'ADMIN',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('scopes updates to both member and organization and derives updated_by from the session', async () => {
    patchSpy.mockResolvedValueOnce([{ id: memberId, first_name: 'Ana Maria' }] as never);
    await service.update(accessToken, organizationId, memberId, { first_name: 'Ana Maria' });
    expect(patchSpy).toHaveBeenCalledWith(
      'church_member_records',
      accessToken,
      { first_name: 'Ana Maria', updated_by: actor.id },
      `?id=eq.${memberId}&organization_id=eq.${organizationId}`,
    );
  });
});
