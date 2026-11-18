import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { IdentityService } from '../identity/application/identity.service';
import { SupabaseRestClient } from '../common/supabase/supabase-rest.client';

export const FRAME_AUDIT_ACTIONS = [
  'frame.migration.plan_created',
  'frame.migration.plan_approved',
  'frame.migration.approval_consumed',
  'frame.migration.execution_started',
  'frame.migration.execution_succeeded',
  'frame.migration.execution_failed',
  'frame.migration.execution_blocked',
  'frame.migration.audit_failure',
] as const;

export type FrameAuditAction = (typeof FRAME_AUDIT_ACTIONS)[number];

const ALLOWED_METADATA_KEYS = new Set([
  'plan_sha256',
  'migration_count',
  'migration_versions',
  'execution_id',
  'reason',
  'failure_code',
  'approval_id',
  'commit_sha',
  'project_ref',
  'target',
  'expires_at',
]);

export interface CreateFrameApprovalInput {
  plan_sha256: string;
  commit_sha: string;
  project_ref: string;
  target: 'production';
  migration_versions: string[];
}

@Injectable()
export class AuditService {
  constructor(
    private readonly identity: IdentityService,
    private readonly db: SupabaseRestClient,
  ) {}

  /**
   * Create a short-lived, one-use approval using the existing append-only
   * audit log. The signed Supabase session supplies the actor identity; no
   * client-provided user ID or role is trusted.
   */
  async createFrameApproval(accessToken: string, input: CreateFrameApprovalInput) {
    const actor = await this.identity.requireGlobalAdmin(accessToken);
    if (
      !input ||
      input.target !== 'production' ||
      typeof input.plan_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(input.plan_sha256) ||
      typeof input.commit_sha !== 'string' || !/^[a-f0-9]{40}$/.test(input.commit_sha) ||
      typeof input.project_ref !== 'string' || !/^[a-z0-9]{20}$/.test(input.project_ref) ||
      !Array.isArray(input.migration_versions) ||
      input.migration_versions.length < 1 ||
      input.migration_versions.length > 500 ||
      !input.migration_versions.every((version) => typeof version === 'string' && /^\d{8}(?:\d{6})?$/.test(version)) ||
      new Set(input.migration_versions).size !== input.migration_versions.length ||
      input.migration_versions.some((version, index, all) => index > 0 && version <= all[index - 1])
    ) {
      throw new BadRequestException('Invalid Frame approval payload');
    }

    const approvalId = randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const metadata = {
      approval_id: approvalId,
      plan_sha256: input.plan_sha256,
      commit_sha: input.commit_sha,
      project_ref: input.project_ref,
      target: input.target,
      migration_count: input.migration_versions.length,
      migration_versions: [...input.migration_versions],
      expires_at: expiresAt,
      reason: 'verified_global_admin_approval',
    };

    await this.db.post('audit_logs', accessToken, {
      organization_id: null,
      actor_user_id: actor.id,
      action: 'frame.migration.plan_approved',
      resource_type: 'frame_migration',
      resource_id: null,
      metadata,
    });

    return {
      approval_id: approvalId,
      target: input.target,
      plan_sha256: input.plan_sha256,
      expires_at: expiresAt,
      single_use: true,
    };
  }

  /**
   * Append a platform-level Frame event. This is an audit primitive, not a SQL
   * executor. The caller's Supabase session is preserved so RLS can verify
   * actor_user_id = auth.uid(); platform events intentionally have no org ID.
   */
  async recordFrameEvent(
    accessToken: string,
    action: FrameAuditAction,
    metadata: unknown = {},
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

  private sanitizeMetadata(input: unknown): Record<string, unknown> {
    if (input === null || typeof input !== 'object' || Array.isArray(input)) {
      return {};
    }

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
          output[key] = [...value];
        }
        continue;
      }

      if (key === 'plan_sha256' && typeof value === 'string') {
        if (/^[a-f0-9]{64}$/.test(value)) output[key] = value;
        continue;
      }
      if (key === 'commit_sha' && typeof value === 'string') {
        if (/^[a-f0-9]{40}$/.test(value)) output[key] = value;
        continue;
      }
      if (key === 'project_ref' && typeof value === 'string') {
        if (/^[a-z0-9]{20}$/.test(value)) output[key] = value;
        continue;
      }
      if (key === 'target' && value === 'production') {
        output[key] = value;
        continue;
      }
      if (key === 'approval_id' && typeof value === 'string') {
        if (/^[0-9a-f-]{36}$/.test(value)) output[key] = value;
        continue;
      }
      if (key === 'expires_at' && typeof value === 'string') {
        if (!Number.isNaN(Date.parse(value))) output[key] = value;
        continue;
      }

      if (typeof value === 'string') {
        const maxLength = key === 'reason' ? 200 : 100;
        if (value.length <= maxLength) output[key] = value;
      }
    }
    return output;
  }
}
