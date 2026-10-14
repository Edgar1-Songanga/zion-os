import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';
import { ChurchMemberBaptismsService } from './church-member-baptisms.service';

describe('ChurchMemberBaptismsService', () => {
  const accessToken = 'test-access-token';
  const organizationId = 'd8c1d6c7-7db3-4e5a-9f6c-6edc8f98d5c2';
  const memberId = 'a8f76a77-8d8d-47b4-9a6e-4e6dbac1d3bb';
  const baptismId = 'd47df0aa-31a2-48dd-a76a-6d71a0b5a291';
  const actor = { id: '7c85f8ce-9d2a-4ed9-9cc5-1c43f1f9b4d1' };
  let service: ChurchMemberBaptismsService;
  let getSpy: jest.SpyInstance;
  let postSpy: jest.SpyInstance;
  let patchSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.restoreAllMocks();
    const identity = { getCurrentUser: jest.fn().mockResolvedValue(actor) } as unknown as IdentityService;
    service = new ChurchMemberBaptismsService(identity);
    getSpy = jest.spyOn(SupabaseRestClient.prototype, 'get').mockResolvedValue([] as never);
    postSpy = jest.spyOn(SupabaseRestClient.prototype, 'post').mockResolvedValue([] as never);
    patchSpy = jest.spyOn(SupabaseRestClient.prototype, 'patch').mockResolvedValue([] as never);
  });

  it('lists baptism records scoped to the selected organization', async () => {
    await service.list(accessToken, organizationId);
    expect(getSpy).toHaveBeenCalledWith(
      'church_member_baptism_records',
      accessToken,
      expect.stringContaining(`organization_id=eq.${organizationId}`),
    );
  });

  it('creates a pending record with the authenticated actor and trimmed evidence fields', async () => {
    postSpy.mockResolvedValueOnce([{ id: baptismId, status: 'PENDING' }] as never);
    await service.create(accessToken, organizationId, {
      member_record_id: memberId,
      baptism_date: '2024-06-15',
      location: '  Igreja Central  ',
      congregation_name: '  Central  ',
      minister_name: '  João Silva  ',
      document_reference: '  ARQ-2024-17  ',
    });
    expect(postSpy).toHaveBeenCalledWith('church_member_baptism_records', accessToken, expect.objectContaining({
      organization_id: organizationId,
      member_record_id: memberId,
      status: 'PENDING',
      created_by: actor.id,
      location: 'Igreja Central',
      congregation_name: 'Central',
      minister_name: 'João Silva',
      document_reference: 'ARQ-2024-17',
    }));
  });

  it('rejects impossible dates before writing', async () => {
    await expect(service.create(accessToken, organizationId, {
      member_record_id: memberId,
      baptism_date: '2026-02-31',
      location: 'Igreja Central',
      congregation_name: 'Central',
      minister_name: 'João Silva',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('requires location, congregation and minister details', async () => {
    await expect(service.create(accessToken, organizationId, {
      member_record_id: memberId,
      baptism_date: '2024-06-15',
      location: ' ',
      congregation_name: 'Central',
      minister_name: 'João Silva',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('allows only explicit final decisions and scopes them to pending records', async () => {
    patchSpy.mockResolvedValueOnce([{ id: baptismId, status: 'VALIDATED' }] as never);
    await service.decide(accessToken, organizationId, baptismId, {
      status: 'VALIDATED',
      validation_note: 'Documento conferido',
    });
    expect(patchSpy).toHaveBeenCalledWith(
      'church_member_baptism_records',
      accessToken,
      { status: 'VALIDATED', validation_note: 'Documento conferido' },
      `?id=eq.${baptismId}&organization_id=eq.${organizationId}&status=eq.PENDING`,
    );
  });

  it('rejects PENDING as a decision status', async () => {
    await expect(service.decide(accessToken, organizationId, baptismId, { status: 'PENDING' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(patchSpy).not.toHaveBeenCalled();
  });

  it('reports when a decision did not update a pending accessible record', async () => {
    await expect(service.decide(accessToken, organizationId, baptismId, { status: 'REJECTED' }))
      .rejects.toBeInstanceOf(NotFoundException);
  });
});
