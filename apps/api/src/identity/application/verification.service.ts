import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

export type VerificationStatus = {
  user_id: string;
  is_founder: boolean;
  verification_status: 'not_verified' | 'pending' | 'verified' | 'rejected' | 'suspended';
  verification_type: string | null;
  verified_at: string | null;
};

const REQUEST_TYPES = ['personal', 'professional', 'pastor', 'ministry', 'organization'] as const;
type RequestType = typeof REQUEST_TYPES[number];

@Injectable()
export class VerificationService {
  private readonly db = new SupabaseRestClient();

  constructor(private readonly identity: IdentityService) {}

  async getStatus(accessToken: string): Promise<VerificationStatus> {
    const user = await this.identity.getCurrentUser(accessToken);
    const [rows, pending] = await Promise.all([
      this.db.get<VerificationStatus[]>(
        'account_identity_status',
        accessToken,
        `?select=user_id,is_founder,verification_status,verification_type,verified_at&user_id=eq.${user.id}&limit=1`,
      ),
      this.db.get<Array<{ requested_type: RequestType }>>(
        'account_verification_requests',
        accessToken,
        `?select=requested_type&user_id=eq.${user.id}&status=eq.pending&order=submitted_at.desc&limit=1`,
      ),
    ]);
    const status = rows[0] ?? {
      user_id: user.id,
      is_founder: false,
      verification_status: 'not_verified' as const,
      verification_type: null,
      verified_at: null,
    };
    if (pending[0] && status.verification_status !== 'verified' && status.verification_status !== 'suspended') {
      return { ...status, verification_status: 'pending', verification_type: status.verification_type ?? pending[0].requested_type };
    }
    return status;
  }

  async requestVerification(accessToken: string, requestedType: string) {
    const user = await this.identity.getCurrentUser(accessToken);
    if (!REQUEST_TYPES.includes(requestedType as RequestType)) {
      throw new BadRequestException('Tipo de verificação inválido.');
    }
    const current = await this.getStatus(accessToken);
    if (current.verification_status === 'verified' || current.verification_status === 'suspended') {
      throw new ConflictException('A conta já tem um estado de verificação que impede um novo pedido.');
    }
    const pending = await this.db.get<Array<{ id: string }>>(
      'account_verification_requests',
      accessToken,
      `?select=id&user_id=eq.${user.id}&status=eq.pending&limit=1`,
    );
    if (pending.length) throw new ConflictException('Já existe um pedido de verificação pendente.');
    const created = await this.db.post<Array<{ id: string; status: string; submitted_at: string }>>(
      'account_verification_requests',
      accessToken,
      { user_id: user.id, requested_type: requestedType, status: 'pending' },
    );
    if (!created[0]) throw new ConflictException('Não foi possível registar o pedido de verificação.');
    return created[0];
  }

  async pendingRequests(accessToken: string) {
    await this.identity.requireGlobalAdmin(accessToken);
    return this.db.get<Array<{
      id: string;
      user_id: string;
      requested_type: RequestType;
      submitted_at: string;
      evidence_refs: unknown[];
    }>>(
      'account_verification_requests',
      accessToken,
      '?select=id,user_id,requested_type,submitted_at,evidence_refs&status=eq.pending&order=submitted_at.asc&limit=200',
    );
  }

  async review(accessToken: string, requestId: string, decision: string, reason?: string) {
    await this.identity.requireGlobalAdmin(accessToken);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
      throw new BadRequestException('Identificador do pedido inválido.');
    }
    if (decision !== 'approved' && decision !== 'rejected') {
      throw new BadRequestException('A decisão deve ser aprovar ou rejeitar.');
    }
    const cleanReason = reason?.trim() ?? '';
    if (cleanReason.length > 1000) throw new BadRequestException('A justificação não pode exceder 1000 caracteres.');
    return this.db.rpc<Record<string, unknown>>(
      'review_account_verification_request',
      accessToken,
      { p_request_id: requestId, p_decision: decision, p_reason: cleanReason || null },
    );
  }
}
