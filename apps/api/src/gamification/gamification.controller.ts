import { Controller, Get, Headers, UnauthorizedException } from "@nestjs/common";
import { getSupabaseUser } from "../identity/infrastructure/supabase-auth.client";
import { GamificationService } from "./gamification.service";

@Controller("v1/gamification")
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}

  @Get("me")
  async me(@Headers("authorization") authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, "").trim();
    if (!token) throw new UnauthorizedException("Bearer token is required");
    const user = await getSupabaseUser(token);
    if (!user) throw new UnauthorizedException("Invalid or expired Supabase session");
    return this.gamification.me(token, user.id);
  }
}
