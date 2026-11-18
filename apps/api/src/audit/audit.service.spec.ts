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


  it('creates a short-lived approval bound to the verified administrator and exact plan', async () => {
    post.mockResolvedValue([]);
    const result = await service.createFrameApproval('admin-token', {
      plan_sha256: 'a'.repeat(64),
      commit_sha: 'b'.repeat(40),
      project_ref: 'w'.repeat(20),
      target: 'production',
      migration_versions: ['20261118050825', '20261118050826'],
    });

    expect(requireGlobalAdmin).toHaveBeenCalledWith('admin-token');
    expect(result.single_use).toBe(true);
    expect(result.approval_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(Date.parse(result.expires_at)).toBeGreaterThan(Date.now());
    expect(Date.parse(result.expires_at)).toBeLessThanOrEqual(Date.now() + 15 * 60 * 1000 + 1000);
    expect(post).toHaveBeenCalledWith('audit_logs', 'admin-token', expect.objectContaining({
      organization_id: null,
      actor_user_id: 'admin-123',
      action: 'frame.migration.plan_approved',
      resource_type: 'frame_migration',
      metadata: expect.objectContaining({
        approval_id: result.approval_id,
        plan_sha256: 'a'.repeat(64),
        commit_sha: 'b'.repeat(40),
        project_ref: 'w'.repeat(20),
        target: 'production',
        migration_count: 2,
        migration_versions: ['20261118050825', '20261118050826'],
      }),
    }));
  });

  it('rejects malformed approval bindings and does not write an approval', async () => {
    await expect(service.createFrameApproval('admin-token', {
      plan_sha256: 'not-a-hash',
      commit_sha: 'b'.repeat(40),
      project_ref: 'w'.repeat(20),
      target: 'production',
      migration_versions: ['20261118050825'],
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(post).not.toHaveBeenCalled();
  });

  it('does not issue approvals to non-global administrators', async () => {
    requireGlobalAdmin.mockRejectedValue(new ForbiddenException());
    await expect(service.createFrameApproval('member-token', {
      plan_sha256: 'a'.repeat(64),
      commit_sha: 'b'.repeat(40),
      project_ref: 'w'.repeat(20),
      target: 'production',
      migration_versions: ['20261118050825'],
    })).rejects.toBeInstanceOf(ForbiddenException);
    expect(post).not.toHaveBeenCalled();
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
      metadata: {},
    }));
  });

  it.each([null, undefined, 'invalid', 42, ['not', 'a', 'metadata', 'object']])(
    'safely discards malformed runtime metadata: %p',
    async (metadata) => {
      post.mockResolvedValue([]);
      await expect(
        service.recordFrameEvent(
          'admin-token',
          'frame.migration.execution_blocked',
          metadata,
        ),
      ).resolves.toBeUndefined();

      expect(post).toHaveBeenCalledWith('audit_logs', 'admin-token', expect.objectContaining({
        metadata: {},
      }));
    },
  );
});
