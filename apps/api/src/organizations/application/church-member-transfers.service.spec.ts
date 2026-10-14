import { BadRequestException } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';
import { ChurchMemberTransfersService } from './church-member-transfers.service';

describe('ChurchMemberTransfersService', () => {
  const accessToken = 'test-access-token';
  const organizationId = 'd8c1d6c7-7db3-4e5a-9f6c-6edc8f98d5c2';
  const destinationOrganizationId = 'e8c1d6c7-7db3-4e5a-9f6c-6edc8f98d5c2';
  const memberId = 'a8f76a77-8d8d-47b4-9a6e-4e6dbac1d3bb';
  const actor = { id: '7c85f8ce-9d2a-4ed9-9cc5-1c43f1f9b4d1' };
  let service: ChurchMemberTransfersService;
  let getSpy: jest.SpyInstance;
  let postSpy: jest.SpyInstance;
  let patchSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.restoreAllMocks();
    const identity = { getCurrentUser: jest.fn().mockResolvedValue(actor) } as unknown as IdentityService;
    service = new ChurchMemberTransfersService(identity);
    getSpy = jest.spyOn(SupabaseRestClient.prototype, 'get').mockResolvedValue([] as never);
    postSpy = jest.spyOn(SupabaseRestClient.prototype, 'post').mockResolvedValue([] as never);
    patchSpy = jest.spyOn(SupabaseRestClient.prototype, 'patch').mockResolvedValue([] as never);
  });

  it('lists transfers scoped to origin or destination organization', async () => {
    await service.list(accessToken, organizationId);
    expect(getSpy).toHaveBeenCalledWith(
      'church_member_transfers',
      accessToken,
      expect.stringContaining(`origin_organization_id.eq.${organizationId},destination_organization_id.eq.${organizationId}`),
    );
  });

  it('creates a draft transfer with the authenticated requester identity', async () => {
    postSpy.mockResolvedValueOnce([{ id: 'c8f76a77-8d8d-47b4-9a6e-4e6dbac1d3bb', status: 'DRAFT' }] as never);
    await service.create(accessToken, organizationId, {
      member_record_id: memberId,
      destination_organization_id: destinationOrganizationId,
      request_date: '2026-10-14',
      reason: 'Family relocation',
    });
    expect(postSpy).toHaveBeenCalledWith(
      'church_member_transfers',
      accessToken,
      expect.objectContaining({
        member_record_id: memberId,
        origin_organization_id: organizationId,
        destination_organization_id: destinationOrganizationId,
        requested_by: actor.id,
        status: 'DRAFT',
      }),
    );
  });

  it('rejects transfers to the same organization before writing', async () => {
    await expect(service.create(accessToken, organizationId, {
      member_record_id: memberId,
      destination_organization_id: organizationId,
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('rejects impossible request dates before writing', async () => {
    await expect(service.create(accessToken, organizationId, {
      member_record_id: memberId,
      destination_organization_id: destinationOrganizationId,
      request_date: '2026-02-31',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('rejects unsupported workflow states before patching', async () => {
    await expect(service.changeStatus(accessToken, organizationId, 'c8f76a77-8d8d-47b4-9a6e-4e6dbac1d3bb', {
      status: 'APPROVED',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(patchSpy).not.toHaveBeenCalled();
  });
});
