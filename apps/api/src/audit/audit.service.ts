import { BadRequestException, Injectable } from '@nestjs/common';
import { IdentityService } from '../identity/application/identity.service';
import { SupabaseRestClient } from '../common/supabase/supabase-rest.client';

export const FRAME_AUDIT_ACTIONS = [
  'frame.migration.plan_created',
  'frame.migration.plan_approved',
  'frame.migration.execution_started',
  'frame.migration.execution_succeeded',
  'frame.migration.execution_failed',
  'frame.migration.execution_blocked',
] as const;

export type FrameAuditAction = (typeof FRAME_AUDIT_ACTIONS)[number];

const ALLOWED_METADATA_KEYS = new Set([
  'plan_sha256',
  'migration_count',
  'migration_versions',
  'execution_id',
  'reason',
  'failure_code',
]);

@Injectable()
export class AuditService {
  constructor(
    private readonly identity: IdentityService,
    private readonly db: SupabaseRestClient,
  ) {}

  /**
   * Append a platform-level Frame event. This is an audit primitive, not a SQL
   * executor. The caller's Supabase session is preserved so RLS can verify
   * actor_user_id = auth.uid(); platform events intentionally have no org ID.
   */
  async recordFrameEvent(
    accessToken: string,
    action: FrameAuditAction,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    if (!(FRAME_AUDIT_ACTIONS as readonly string[]).includes(action)) {
      throw new BadRequestException('Unsupported Frame audit action');
    }

    const actor = await this.identity.requireGlobalAdmin(accessToken);
    const safeMetadata = this.sanitizeMetadata(metadata);

    await this.db.post(
      'audit_logs',
      accessToken,
      {
        organization_id: null,
        actor_user_id: actor.id,
        action,
        resource_type: 'frame_migration',
        resource_id: null,
        metadata: safeMetadata,
      },
    );
  }

  private sanitizeMetadata(input: Record<string, unknown>): Record<string, unknown> {
    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (!ALLOWED_METADATA_KEYS.has(key)) continue;

      if (key === 'migration_count') {
        if (Number.isSafeInteger(value) && Number(value) >= 0) output[key] = value;
        continue;
      }

      if (key === 'migration_versions') {
        if (
          Array.isArray(value) &&
          value.length <= 500 &&
          value.every((item) => typeof item === 'string' && /^\d{8}(?:\d{6})?$/.test(item))
        ) {
          output[key] = value;
        }
        continue;
      }

      if (typeof value === 'string') {
        const maxLength = key === 'plan_sha256' ? 64 : 200;
        const valid = key !== 'plan_sha256' || /^[a-f0-9]{64}$/.test(value);
        if (valid && value.length <= maxLength) output[key] = value;
      }
    }
    return output;
  }
}
