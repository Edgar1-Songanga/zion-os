import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { AuditService } from './audit.service';
import { IdentityService } from '../identity/application/identity.service';
import { SupabaseRestClient } from '../common/supabase/supabase-rest.client';

describe('AuditService Frame events', () => {
  const requireGlobalAdmin = jest.fn();
  const post = jest.fn();
  let service: AuditService;

  beforeEach(() => {
    jest.resetAllMocks();
    requireGlobalAdmin.mockResolvedValue({ id: 'admin-123', email: 'admin@example.invalid' });
    service = new AuditService(
      { requireGlobalAdmin } as unknown as IdentityService,
      { post } as unknown as SupabaseRestClient,
    );
  });

  it('requires a verified global administrator before writing an event', async () => {
    requireGlobalAdmin.mockRejectedValue(new ForbiddenException());

    await expect(
      service.recordFrameEvent('member-token', 'frame.migration.plan_created'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(post).not.toHaveBeenCalled();
  });

  it('writes the actor-bound platform event and strips unapproved metadata', async () => {
    post.mockResolvedValue([]);
    await service.recordFrameEvent('admin-token', 'frame.migration.plan_created', {
      plan_sha256: 'a'.repeat(64),
      migration_count: 2,
      migration_versions: ['20261001', '20261001123456'],
      reason: 'reviewed',
      access_token: 'must-not-be-recorded',
      sql: 'must-not-be-recorded',
      extra: { secret: true },
    });

    expect(requireGlobalAdmin).toHaveBeenCalledWith('admin-token');
    expect(post).toHaveBeenCalledWith('audit_logs', 'admin-token', {
      organization_id: null,
      actor_user_id: 'admin-123',
      action: 'frame.migration.plan_created',
      resource_type: 'frame_migration',
      resource_id: null,
      metadata: {
        plan_sha256: 'a'.repeat(64),
        migration_count: 2,
        migration_versions: ['20261001', '20261001123456'],
        reason: 'reviewed',
      },
    });
  });

  it('rejects unsupported event names before any authorization or database call', async () => {
    await expect(
      service.recordFrameEvent('admin-token', 'frame.migration.sql_execute' as never),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(requireGlobalAdmin).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });

  it('drops malformed hashes, oversized values, and malformed migration versions', async () => {
    post.mockResolvedValue([]);
    await service.recordFrameEvent('admin-token', 'frame.migration.execution_blocked', {
      plan_sha256: 'not-a-sha',
      reason: 'r'.repeat(201),
      migration_count: -1,
      migration_versions: ['valid-looking', '20261001'],
    });

    expect(post).toHaveBeenCalledWith('audit_logs', 'admin-token', expect.objectContaining({
      metadata: { migration_versions: ['20261001'] },
    }));
  });
});
