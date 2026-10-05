import { BadRequestException } from '@nestjs/common';
import { MemberServicesService } from './member-services.service';

describe('MemberServicesService', () => {
  const identity = { getCurrentUser: jest.fn().mockResolvedValue({ id: 'member-1' }) };
  const db = { get: jest.fn(), post: jest.fn(), patch: jest.fn() };
  let service: MemberServicesService;
  beforeEach(() => {
    jest.clearAllMocks();
    service = new MemberServicesService(identity as never);
    (service as unknown as { db: typeof db }).db = db;
  });

  it('allows a member to submit a transfer request with a destination', async () => {
    db.post.mockResolvedValueOnce([{ id: 'request-1', status: 'SUBMITTED' }]).mockResolvedValueOnce([]);
    await expect(service.create('token', { organization_id: 'org-1', destination_organization_id: 'org-2', service_type: 'MEMBERSHIP_TRANSFER', subject: 'Transfer to Central' })).resolves.toEqual({ id: 'request-1', status: 'SUBMITTED' });
    expect(db.post).toHaveBeenCalledWith('member_service_requests', 'token', expect.objectContaining({ applicant_user_id: 'member-1', organization_id: 'org-1', destination_organization_id: 'org-2' }));
  });

  it('requires a destination for transfers', async () => {
    await expect(service.create('token', { organization_id: 'org-1', service_type: 'MEMBERSHIP_TRANSFER', subject: 'Transfer' })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.post).not.toHaveBeenCalled();
  });

  it('records secretary status transitions in the request history', async () => {
    db.get.mockResolvedValue([{ id: 'request-1', status: 'SUBMITTED' }]);
    db.patch.mockResolvedValue([{ id: 'request-1', status: 'IN_REVIEW' }]);
    await expect(service.updateStatus('token', 'request-1', 'IN_REVIEW', 'Review started')).resolves.toEqual({ id: 'request-1', status: 'IN_REVIEW' });
    expect(db.post).toHaveBeenCalledWith('member_service_request_events', 'token', expect.objectContaining({ from_status: 'SUBMITTED', to_status: 'IN_REVIEW', actor_user_id: 'member-1' }));
  });
});
