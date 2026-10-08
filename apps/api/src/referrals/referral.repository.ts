import { Injectable } from "@nestjs/common";
import { SupabaseRestClient } from "../common/supabase/supabase-rest.client";
import { ReferralEngine } from '@zion/referral-engine';

type CodeRow = { user_id: string; code: string; created_at: string };
type ReferralRow = { id: string; referrer_user_id: string; referred_user_id: string | null; code: string; status: "pending" | "qualified" | "rejected"; created_at: string; qualified_at: string | null };

@Injectable()
export class ReferralRepository {
  private readonly engine = new ReferralEngine();

  constructor(private readonly db: SupabaseRestClient) {}

  async getOrCreateCode(token: string, userId: string) {
    const existing = await this.db.get<CodeRow[]>(
      "zion_referral_codes",
      token,
      "?user_id=eq." + encodeURIComponent(userId) + "&limit=1",
    );
    if (existing[0]) return existing[0];

    const code = this.engine.createCode(userId);
    const rows = await this.db.upsert<CodeRow[]>(
      "zion_referral_codes",
      token,
      { user_id: userId, code },
      "?on_conflict=user_id",
    );
    return rows[0];
  }

  async listMine(token: string, userId: string) {
    return this.db.get<ReferralRow[]>(
      "zion_referrals",
      token,
      "?referrer_user_id=eq." + encodeURIComponent(userId) + "&order=created_at.desc&limit=100",
    );
  }
}
