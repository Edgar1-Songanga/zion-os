import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IdentityService } from '../identity/application/identity.service';
import { SupabaseRestClient } from '../common/supabase/supabase-rest.client';

@Injectable()
export class PlatformService {
  private readonly db = new SupabaseRestClient();

  constructor(private readonly identity: IdentityService) {}

  private async actor(token: string) {
    return this.identity.getCurrentUser(token);
  }

  private text(value: unknown, field: string, max = 120) {
    if (typeof value !== 'string') throw new BadRequestException(`${field} must be text`);
    const result = value.trim();
    if (result.length < 2 || result.length > max) throw new BadRequestException(`${field} is invalid`);
    return result;
  }

  private uuid(value: unknown, field: string) {
    const result = this.text(value, field, 80);
    if (!/^[0-9a-f-]{16,80}$/i.test(result)) throw new BadRequestException(`${field} is invalid`);
    return result;
  }

  private limit(value: unknown, fallback: number, maximum: number) {
    return Math.min(Math.max(Number(value) || fallback, 1), maximum);
  }

  async upsertSearchDocument(token: string, input: { entity_type: unknown; entity_id: unknown; title: unknown; body?: unknown; language?: unknown; visibility?: unknown; organization_id?: unknown }) {
    const actor = await this.actor(token);
    const entityType = this.text(input.entity_type, 'entity_type', 80).toLowerCase();
    const title = this.text(input.title, 'title', 240);
    const visibility = input.visibility === undefined ? 'public' : this.text(input.visibility, 'visibility', 30);
    if (!['public', 'private', 'organization'].includes(visibility)) throw new BadRequestException('visibility is invalid');
    const rows = await this.db.upsert<any[]>('zion_search_documents', token, {
      entity_type: entityType,
      entity_id: this.uuid(input.entity_id, 'entity_id'),
      title,
      body: typeof input.body === 'string' ? input.body.trim() || null : null,
      language: typeof input.language === 'string' ? input.language.trim().slice(0, 12) || 'pt' : 'pt',
      visibility,
      organization_id: input.organization_id ? this.uuid(input.organization_id, 'organization_id') : null,
      updated_at: new Date().toISOString(),
    }, '?on_conflict=entity_type,entity_id');
    return { actor_id: actor.id, document: rows[0] };
  }

  async search(token: string, query: unknown, type?: unknown, limit?: unknown) {
    await this.actor(token);
    const term = this.text(query, 'q', 120).replace(/[(),]/g, ' ');
    const size = this.limit(limit, 30, 100);
    const typeFilter = type ? `&entity_type=eq.${encodeURIComponent(this.text(type, 'type', 80).toLowerCase())}` : '';
    return this.db.get('zion_search_documents', token, `?select=*&or=(title.ilike.*${encodeURIComponent(term)}*,body.ilike.*${encodeURIComponent(term)}*)&order=updated_at.desc&limit=${size}${typeFilter}`);
  }

  async publishEvent(token: string, input: { event_type: unknown; aggregate_type: unknown; aggregate_id: unknown; payload?: unknown }) {
    const actor = await this.actor(token);
    const rows = await this.db.post<any[]>('zion_domain_events', token, {
      event_type: this.text(input.event_type, 'event_type'),
      aggregate_type: this.text(input.aggregate_type, 'aggregate_type', 80),
      aggregate_id: this.uuid(input.aggregate_id, 'aggregate_id'),
      actor_user_id: actor.id,
      payload: input.payload && typeof input.payload === 'object' ? input.payload : {},
    });
    return rows[0];
  }

  async recordAnalytics(token: string, input: { event_name: unknown; entity_type?: unknown; entity_id?: unknown; properties?: unknown; occurred_at?: unknown }) {
    const actor = await this.actor(token);
    const eventName = this.text(input.event_name, 'event_name').toLowerCase();
    if (!/^[a-z0-9][a-z0-9_.-]{1,119}$/.test(eventName)) throw new BadRequestException('event_name is invalid');
    const occurredAt = input.occurred_at ? new Date(String(input.occurred_at)) : new Date();
    if (Number.isNaN(occurredAt.getTime())) throw new BadRequestException('occurred_at is invalid');
    const rows = await this.db.post<any[]>('zion_analytics_events', token, {
      event_name: eventName,
      actor_user_id: actor.id,
      entity_type: input.entity_type ? this.text(input.entity_type, 'entity_type', 80) : null,
      entity_id: input.entity_id ? this.uuid(input.entity_id, 'entity_id') : null,
      properties: input.properties && typeof input.properties === 'object' ? input.properties : {},
      occurred_at: occurredAt.toISOString(),
    });
    return rows[0];
  }

  async analyticsSummary(token: string, eventName?: unknown, limit?: unknown) {
    const actor = await this.actor(token);
    const size = this.limit(limit, 100, 500);
    const filter = eventName ? `&event_name=eq.${encodeURIComponent(this.text(eventName, 'event_name').toLowerCase())}` : '';
    const rows = await this.db.get<Array<{ event_name: string; occurred_at: string }>>('zion_analytics_events', token, `?select=event_name,occurred_at&actor_user_id=eq.${actor.id}&order=occurred_at.desc&limit=${size}${filter}`);
    const counts = rows.reduce<Record<string, number>>((result, row) => { result[row.event_name] = (result[row.event_name] ?? 0) + 1; return result; }, {});
    return { total: rows.length, by_event: counts, events: rows };
  }

  async enqueueJob(token: string, input: { job_type: unknown; payload?: unknown; max_attempts?: unknown; available_at?: unknown }) {
    const actor = await this.actor(token);
    const jobType = this.text(input.job_type, 'job_type').toLowerCase();
    if (!/^[a-z0-9][a-z0-9_.-]{1,119}$/.test(jobType)) throw new BadRequestException('job_type is invalid');
    const maxAttempts = Math.min(Math.max(Number(input.max_attempts) || 3, 1), 20);
    const availableAt = input.available_at ? new Date(String(input.available_at)) : new Date();
    if (Number.isNaN(availableAt.getTime())) throw new BadRequestException('available_at is invalid');
    const rows = await this.db.post<any[]>('zion_jobs', token, {
      job_type: jobType, payload: input.payload && typeof input.payload === 'object' ? input.payload : {},
      max_attempts: maxAttempts, available_at: availableAt.toISOString(), created_by: actor.id,
    });
    return rows[0];
  }

  async listJobs(token: string, status?: string, limit?: unknown) {
    const actor = await this.actor(token);
    const size = this.limit(limit, 50, 100);
    const statusFilter = status ? `&status=eq.${encodeURIComponent(this.text(status, 'status', 20).toLowerCase())}` : '';
    return this.db.get('zion_jobs', token, `?select=*&created_by=eq.${actor.id}${statusFilter}&order=created_at.desc&limit=${size}`);
  }

  async claimJob(token: string, jobId: string, workerId: unknown) {
    await this.actor(token);
    const worker = this.text(workerId, 'worker_id', 120);
    const id = this.uuid(jobId, 'job_id');
    const jobs = await this.db.get<any[]>('zion_jobs', token, `?select=*&id=eq.${id}&status=eq.queued&available_at=lte.${encodeURIComponent(new Date().toISOString())}&limit=1`);
    const job = jobs[0];
    if (!job) throw new NotFoundException('Claimable job not found');
    const updated = await this.db.patch<any[]>('zion_jobs', token, { status: 'running', attempts: Number(job.attempts ?? 0) + 1, locked_at: new Date().toISOString(), locked_by: worker }, `?id=eq.${id}&status=eq.queued`);
    if (!updated[0]) throw new NotFoundException('Job was claimed by another worker');
    return updated[0];
  }

  async completeJob(token: string, jobId: string, input: { status: string; result?: unknown; error?: unknown }) {
    await this.actor(token);
    const status = this.text(input.status, 'status', 20).toLowerCase();
    if (!['completed', 'failed', 'cancelled'].includes(status)) throw new BadRequestException('Terminal job status is invalid');
    const id = this.uuid(jobId, 'job_id');
    const rows = await this.db.patch<any[]>('zion_jobs', token, {
      status, result: input.result && typeof input.result === 'object' ? input.result : null,
      last_error: typeof input.error === 'string' ? input.error.trim().slice(0, 2000) || null : null,
      locked_at: null, locked_by: null,
    }, `?id=eq.${id}&status=eq.running`);
    if (!rows[0]) throw new NotFoundException('Running job not found');
    return rows[0];
  }
}
