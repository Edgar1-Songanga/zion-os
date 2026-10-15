import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

type IdentityStatus = {
  user_id: string;
  is_founder: boolean;
  verification_status: 'not_verified' | 'pending' | 'verified' | 'rejected' | 'suspended';
  verification_type: string | null;
  verified_at: string | null;
};

@Injectable()
export class VerificationService {
  private readonly db = new SupabaseRestClient();

  constructor(private readonly identity: IdentityService) {}

  async getStatus(accessToken: string): Promise<IdentityStatus> {
    const user = await this.identity.getCurrentUser(accessToken);
    const rows = await this.db.get<IdentityStatus[]>(
      'account_identity_status',
      accessToken,
      `?select=user_id,is_founder,verification_status,verification_type,verified_at&user_id=eq.${user.id}&limit=1`,
    );
    return rows[0] ?? {
      user_id: user.id,
      is_founder: false,
      verification_status: 'not_verified',
      verification_type: null,
      verified_at: null,
    };
  }

  async requestVerification(accessToken: string, requestedType: string) {
    const user = await this.identity.getCurrentUser(accessToken);
    const currentStatus = await this.getStatus(accessToken);
    if (currentStatus.verification_status === 'verified' || currentStatus.verification_status === 'suspended') {
      throw new ConflictException('A conta já tem um estado de verificação que impede um novo pedido.');
    }
    const allowed = ['personal', 'professional', 'pastor', 'ministry', 'organization'];
    if (!allowed.includes(requestedType)) {
      throw new BadRequestException('Tipo de verificação inválido.');
    }
    const existing = await this.db.get<Array<{ id: string }>>(
      'account_verification_requests',
      accessToken,
      `?select=id&user_id=eq.${user.id}&status=eq.pending&limit=1`,
    );
    if (existing.length) {
      throw new ConflictException('Já existe um pedido de verificação pendente.');
    }
    const rows = await this.db.post<Array<{ id: string; status: string; submitted_at: string }>>(
      'account_verification_requests',
      accessToken,
      { user_id: user.id, requested_type: requestedType, status: 'pending' },
    );
    if (!rows[0]) throw new ConflictException('Não foi possível registar o pedido de verificação.');
    return rows[0];
  }
}
