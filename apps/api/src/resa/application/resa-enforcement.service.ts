import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

@Injectable()
export class ResaEnforcementService {
  private readonly db = new SupabaseRestClient();
  constructor(private readonly identity: IdentityService) {}

  private async actor(token: string) {
    const user = await this.identity.getCurrentUser(token);
    if (!user?.id) throw new NotFoundException('Authenticated user was not found');
    return user;
  }

  private id(value: string) {
    if (!/^[0-9a-f-]{16,80}$/i.test(value)) throw new BadRequestException('Invalid identifier');
    return value;
  }

  private limit(value: number) { return Math.min(Math.max(Number(value) || 50, 1), 100); }

  async applyAction(token: string, contentId: string, input: { action_type?: unknown; reason?: unknown }) {
    await this.actor(token);
    const actionType = input.action_type;
    if (actionType !== 'content_removed' && actionType !== 'formal_warning') {
      throw new BadRequestException('Tipo de medida não suportado.');
    }
    const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
    if (reason.length < 10 || reason.length > 2000) {
      throw new BadRequestException('A fundamentação deve ter entre 10 e 2000 caracteres.');
    }
    const result = await this.db.rpc<any>('resa_apply_content_moderation_action', token, {
      p_content_id: this.id(contentId),
      p_action_type: actionType,
      p_reason: reason,
    });
    if (!result?.id) throw new BadRequestException('A medida não foi registada.');
    return result;
  }

  async myActions(token: string, limit = 50) {
    const actor = await this.actor(token);
    return this.db.get<any[]>('resa_moderation_actions', token,
      `?select=id,content_id,action_type,reason,status,created_at,revoked_at,revocation_note&target_user_id=eq.${actor.id}&order=created_at.desc&limit=${this.limit(limit)}`);
  }

  async appeal(token: string, actionId: string, input: { reason?: unknown; details?: unknown }) {
    const actor = await this.actor(token);
    const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
    const details = typeof input.details === 'string' ? input.details.trim() : '';
    if (reason.length < 10 || reason.length > 2000) throw new BadRequestException('Explica o motivo do recurso (10 a 2000 caracteres).');
    if (details.length > 5000) throw new BadRequestException('Os detalhes não podem exceder 5000 caracteres.');
    const action = (await this.db.get<any[]>('resa_moderation_actions', token,
      `?select=id,target_user_id,action_type,status&id=eq.${this.id(actionId)}&target_user_id=eq.${actor.id}&limit=1`))[0];
    if (!action || action.status !== 'active' || action.action_type !== 'content_removed') {
      throw new NotFoundException('Não existe uma sanção de remoção ativa que possa ser contestada.');
    }
    const rows = await this.db.post<any[]>('resa_content_moderation_appeals', token, {
      action_id: action.id, appellant_id: actor.id, reason, details: details || null,
    });
    if (!rows[0]) throw new BadRequestException('O recurso não foi registado.');
    return rows[0];
  }

  async myAppeals(token: string, limit = 50) {
    const actor = await this.actor(token);
    return this.db.get<any[]>('resa_content_moderation_appeals', token,
      `?select=id,action_id,reason,details,status,decision_note,reviewed_at,created_at&appellant_id=eq.${actor.id}&order=created_at.desc&limit=${this.limit(limit)}`);
  }

  async queue(token: string, status = 'open', limit = 50) {
    await this.actor(token);
    if (!['open','reviewing','upheld','overturned'].includes(status)) throw new BadRequestException('Estado de recurso inválido.');
    return this.db.get<any[]>('resa_content_moderation_appeals', token,
      `?select=*&status=eq.${status}&order=created_at.asc&limit=${this.limit(limit)}`);
  }

  async decide(token: string, appealId: string, status: 'reviewing'|'upheld'|'overturned', note?: unknown) {
    await this.actor(token);
    if (!['reviewing','upheld','overturned'].includes(status)) throw new BadRequestException('Decisão inválida.');
    const decisionNote = typeof note === 'string' ? note.trim() : '';
    if (status !== 'reviewing' && (!decisionNote || decisionNote.length > 2000)) {
      throw new BadRequestException('A decisão final exige fundamentação (máximo 2000 caracteres).');
    }
    const result = await this.db.rpc<any>('resa_decide_content_moderation_appeal', token, {
      p_appeal_id: this.id(appealId), p_status: status, p_decision_note: decisionNote || null,
    });
    if (!result?.id) throw new BadRequestException('Não foi possível concluir a reapreciação.');
    return result;
  }
}
