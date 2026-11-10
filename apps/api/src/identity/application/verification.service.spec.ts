import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

const USER_ID = '33333333-3333-4333-8333-333333333333';
const REQUEST_ID = '44444444-4444-4444-8444-444444444444';

describe('VerificationService', () => {
  let service: VerificationService;
  let getSpy: jest.SpyInstance;
  let postSpy: jest.SpyInstance;
  let rpcSpy: jest.SpyInstance;
  const identity = {
    getCurrentUser: jest.fn().mockResolvedValue({ id: USER_ID, email: 'member@example.test' }),
    requireGlobalAdmin: jest.fn().mockResolvedValue({ id: USER_ID }),
  };

  beforeEach(() => {
    identity.getCurrentUser.mockResolvedValue({ id: USER_ID, email: 'member@example.test' });
    identity.requireGlobalAdmin.mockResolvedValue({ id: USER_ID });
    getSpy = jest.spyOn(SupabaseRestClient.prototype, 'get');
    postSpy = jest.spyOn(SupabaseRestClient.prototype, 'post');
    rpcSpy = jest.spyOn(SupabaseRestClient.prototype, 'rpc');
    service = new VerificationService(identity as never);
  });

  afterEach(() => jest.restoreAllMocks());

  it('returns a safe unverified default when no identity row exists', async () => {
    getSpy.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await expect(service.getStatus('token')).resolves.toEqual({
      user_id: USER_ID,
      is_founder: false,
      verification_status: 'not_verified',
      verification_type: null,
      verified_at: null,
    });
  });

  it('creates only an allowed verification request for the authenticated user', async () => {
    getSpy
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    postSpy.mockResolvedValueOnce([{ id: REQUEST_ID, status: 'pending', submitted_at: '2026-11-10T08:00:00Z' }]);
    await service.requestVerification('token', 'personal');
    expect(postSpy).toHaveBeenCalledWith('account_verification_requests', 'token', {
      user_id: USER_ID, requested_type: 'personal', status: 'pending',
    });
  });

  it('rejects unsupported verification types before writing', async () => {
    await expect(service.requestVerification('token', 'global_admin')).rejects.toBeInstanceOf(BadRequestException);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('does not allow ordinary accounts to request founder verification', async () => {
    getSpy.mockResolvedValueOnce([{
      user_id: USER_ID, is_founder: false, verification_status: 'not_verified', verification_type: null, verified_at: null,
    }]).mockResolvedValueOnce([]);
    await expect(service.requestVerification('token', 'founder')).rejects.toBeInstanceOf(ForbiddenException);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('prevents a second pending request', async () => {
    getSpy.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: REQUEST_ID }]);
    await expect(service.requestVerification('token', 'personal')).rejects.toBeInstanceOf(ConflictException);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('requires verified global-admin authorization before listing pending requests', async () => {
    getSpy.mockResolvedValueOnce([]);
    await service.pendingRequests('token');
    expect(identity.requireGlobalAdmin).toHaveBeenCalledWith('token');
    expect(getSpy).toHaveBeenCalledWith('account_verification_requests', 'token', expect.stringContaining('status=eq.pending'));
  });

  it('does not show a global administrator their own verification request', async () => {
    getSpy.mockResolvedValueOnce([
      { id: REQUEST_ID, user_id: USER_ID, requested_type: 'personal', submitted_at: '2026-11-10T08:00:00Z', evidence_refs: [] },
      { id: '55555555-5555-4555-8555-555555555555', user_id: '66666666-6666-4666-8666-666666666666', requested_type: 'pastor', submitted_at: '2026-11-10T08:01:00Z', evidence_refs: [] },
    ]);
    await expect(service.pendingRequests('token')).resolves.toHaveLength(1);
  });

  it('reviews a request through the atomic database workflow', async () => {
    rpcSpy.mockResolvedValueOnce({ request_id: REQUEST_ID, decision: 'approved' });
    await service.review('token', REQUEST_ID, 'approved', 'Evidence checked');
    expect(identity.requireGlobalAdmin).toHaveBeenCalledWith('token');
    expect(rpcSpy).toHaveBeenCalledWith('review_account_verification_request', 'token', {
      p_request_id: REQUEST_ID, p_decision: 'approved', p_reason: 'Evidence checked',
    });
  });

  it('rejects invalid review decisions', async () => {
    await expect(service.review('token', REQUEST_ID, 'verified')).rejects.toBeInstanceOf(BadRequestException);
    expect(rpcSpy).not.toHaveBeenCalled();
  });
});
