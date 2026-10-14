import { BadRequestException } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';
import { ChurchMemberFamiliesService } from './church-member-families.service';

describe('ChurchMemberFamiliesService', () => {
  const accessToken = 'test-access-token';
  const organizationId = 'd8c1d6c7-7db3-4e5a-9f6c-6edc8f98d5c2';
  const memberId = 'a8f76a77-8d8d-47b4-9a6e-4e6dbac1d3bb';
  const relatedMemberId = 'b7f76a77-8d8d-47b4-9a6e-4e6dbac1d3bb';
  const actor = { id: '7c85f8ce-9d2a-4ed9-9cc5-1c43f1f9b4d1' };
  let service: ChurchMemberFamiliesService;
  let getSpy: jest.SpyInstance;
  let postSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.restoreAllMocks();
    const identity = { getCurrentUser: jest.fn().mockResolvedValue(actor) } as unknown as IdentityService;
    service = new ChurchMemberFamiliesService(identity);
    getSpy = jest.spyOn(SupabaseRestClient.prototype, 'get').mockResolvedValue([] as never);
    postSpy = jest.spyOn(SupabaseRestClient.prototype, 'post').mockResolvedValue([] as never);
  });

  it('lists only active relationships in the requested organization', async () => {
    await service.list(accessToken, organizationId);
    expect(getSpy).toHaveBeenCalledWith(
      'church_member_family_relationships',
      accessToken,
      expect.stringContaining(`organization_id=eq.${organizationId}`),
    );
    expect(getSpy).toHaveBeenCalledWith(
      'church_member_family_relationships',
      accessToken,
      expect.stringContaining('is_active=eq.true'),
    );
  });

  it('creates a family relationship with server-derived creator identity', async () => {
    postSpy.mockResolvedValueOnce([{ id: 'c8f76a77-8d8d-47b4-9a6e-4e6dbac1d3bb' }] as never);
    await service.create(accessToken, organizationId, {
      member_record_id: memberId,
      related_member_record_id: relatedMemberId,
      relationship_type: 'PARENT_OF',
      notes: ' Verified by secretary ',
    });
    expect(postSpy).toHaveBeenCalledWith(
      'church_member_family_relationships',
      accessToken,
      expect.objectContaining({
        organization_id: organizationId,
        member_record_id: memberId,
        related_member_record_id: relatedMemberId,
        relationship_type: 'PARENT_OF',
        notes: 'Verified by secretary',
        created_by: actor.id,
      }),
    );
  });

  it('rejects self-relations before writing', async () => {
    await expect(service.create(accessToken, organizationId, {
      member_record_id: memberId,
      related_member_record_id: memberId,
      relationship_type: 'SIBLING',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('rejects unsupported relationship types before writing', async () => {
    await expect(service.create(accessToken, organizationId, {
      member_record_id: memberId,
      related_member_record_id: relatedMemberId,
      relationship_type: 'UNRELATED_ADMIN',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(postSpy).not.toHaveBeenCalled();
  });
});
