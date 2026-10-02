import { ProfileSystemService } from './profile-system.service';

describe('ProfileSystemService', () => {
  const service = new ProfileSystemService();

  it('rejects profiles without an owner or display name', () => {
    expect(() => service.validate({ userId: '', type: 'personal', displayName: 'Name' })).toThrow();
    expect(() => service.validate({ userId: 'u1', type: 'personal', displayName: ' ' })).toThrow();
  });

  it('creates a pending verification request', () => {
    const verification = service.requestVerification({ profileId: 'p1', type: 'creator' as never, evidenceRefs: ['doc://1'] });
    expect(verification.status).toBe('pending');
    expect(verification.id).toMatch(/^[0-9a-f-]{16,}$/i);
  });
});
