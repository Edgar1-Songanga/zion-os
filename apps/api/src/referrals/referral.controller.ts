import { Controller, Get, Headers, UnauthorizedException } from "@nestjs/common";
import { getSupabaseUser } from "../identity/infrastructure/supabase-auth.client";
import { ReferralRepository } from "./referral.repository";

@Controller("v1/referrals")
export class ReferralController {
  constructor(private readonly referrals: ReferralRepository) {}

  @Get("me")
  async me(@Headers("authorization") authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, "").trim();
    if (!token) throw new UnauthorizedException("Bearer token is required");
    const user = await getSupabaseUser(token);
    if (!user) throw new UnauthorizedException("Invalid or expired Supabase session");

    const code = await this.referrals.getOrCreateCode(token, user.id);
    const referrals = await this.referrals.listMine(token, user.id);
    return {
      code: code.code,
      invitePath: "/invite/" + encodeURIComponent(code.code),
      referrals,
      qualifiedCount: referrals.filter((item) => item.status === "qualified").length,
      pendingCount: referrals.filter((item) => item.status === "pending").length,
    };
  }
}
