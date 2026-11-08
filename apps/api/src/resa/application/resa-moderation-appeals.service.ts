import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

@Injectable()
export class ResaModerationAppealsService {
  private readonly db = new SupabaseRestClient();

  constructor(private readonly identity: IdentityService) {}

  private async actor(token: string) {
    const user = await this.identity.getCurrentUser(token);
    if (!user?.id) throw new NotFoundException('Authenticated user was not found');
    return user;
  }

  private validId(value: string) {
    if (!/^[0-9a-f-]{16,80}$/i.test(value)) throw new BadRequestException('Invalid identifier');
    return value;
  }

  async myReports(token: string, limit = 50) {
    const actor = await this.actor(token);
    const size = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const reports = await this.db.get<any[]>(
      'resa_moderation_reports',
      token,
      `?select=id,content_id,message_id,reason,details,status,review_note,reviewed_at,created_at&reporter_id=eq.${actor.id}&order=created_at.desc&limit=${size}`,
    );
    if (!reports.length) return [];
    const ids = reports.map((row) => row.id).join(',');
    const appeals = await this.db.get<any[]>(
      'resa_moderation_appeals',
      token,
      `?select=id,report_id,reason,details,status,decision_note,reviewed_at,created_at&report_id=in.(${ids})&appellant_id=eq.${actor.id}&order=created_at.desc`,
    );
    const byReport = new Map(appeals.map((appeal) => [appeal.report_id, appeal]));
    return reports.map((report) => ({ ...report, appeal: byReport.get(report.id) ?? null }));
  }

  async createAppeal(token: string, reportId: string, input: { reason?: unknown; details?: unknown }) {
    const actor = await this.actor(token);
    const id = this.validId(reportId);
    const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
    const details = typeof input.details === 'string' ? input.details.trim() : '';
    if (reason.length < 10 || reason.length > 2000) {
      throw new BadRequestException('Explique o motivo da reapreciação (10 a 2000 caracteres).');
    }
    if (details.length > 5000) throw new BadRequestException('Os detalhes não podem exceder 5000 caracteres.');
    const report = (await this.db.get<any[]>(
      'resa_moderation_reports', token,
      `?select=id,reporter_id,status,reviewed_by&id=eq.${id}&reporter_id=eq.${actor.id}&limit=1`,
    ))[0];
    if (!report) throw new NotFoundException('Denúncia não encontrada.');
    if (!['resolved', 'dismissed'].includes(report.status)) {
      throw new BadRequestException('Só é possível pedir reapreciação depois de uma decisão final.');
    }
    const rows = await this.db.post<any[]>('resa_moderation_appeals', token, {
      report_id: id,
      appellant_id: actor.id,
      reason,
      details: details || null,
    });
    if (!rows[0]) throw new BadRequestException('Não foi possível registar o pedido de reapreciação.');
    return rows[0];
  }

  async queue(token: string, status = 'open', limit = 50) {
    await this.actor(token);
    if (!['open', 'reviewing', 'upheld', 'overturned'].includes(status)) {
      throw new BadRequestException('Estado de reapreciação inválido.');
    }
    const size = Math.min(Math.max(Number(limit) || 50, 1), 100);
    return this.db.get<any[]>(
      'resa_moderation_appeals', token,
      `?select=*&status=eq.${status}&order=created_at.asc&limit=${size}`,
    );
  }

  async decide(token: string, appealId: string, status: 'reviewing' | 'upheld' | 'overturned', decisionNote?: unknown) {
    const actor = await this.actor(token);
    if (!['reviewing', 'upheld', 'overturned'].includes(status)) {
      throw new BadRequestException('Decisão de reapreciação inválida.');
    }
    const note = typeof decisionNote === 'string' ? decisionNote.trim() : '';
    if (note.length > 2000) throw new BadRequestException('A nota não pode exceder 2000 caracteres.');
    if (status !== 'reviewing' && !note) {
      throw new BadRequestException('Regista a fundamentação antes de concluir a reapreciação.');
    }
    const id = this.validId(appealId);
    const rows = await this.db.patch<any[]>(
      'resa_moderation_appeals', token,
      {
        status,
        reviewed_by: actor.id,
        reviewed_at: new Date().toISOString(),
        decision_note: note || null,
      },
      `?id=eq.${id}`,
    );
    if (!rows[0]) throw new NotFoundException('Pedido não encontrado ou sem permissão para o rever.');
    return rows[0];
  }
}
