import { Controller, Get, Headers, Param, Query, UnauthorizedException } from "@nestjs/common";
import { getSupabaseUser } from "../../identity/infrastructure/supabase-auth.client";
import { AdventistCanonService } from "./adventist-canon.service";
import type { CanonicalAdventistContentType } from "./adventist-canon.types";

@Controller("v1/spiritual/adventist")
export class AdventistCanonController {
  constructor(private readonly service: AdventistCanonService) {}

  private async token(authorization?: string): Promise<string> {
    const token = authorization?.replace(/^Bearer\s+/i, "").trim();
    if (!token) throw new UnauthorizedException("Bearer token is required");
    const user = await getSupabaseUser(token);
    if (!user) throw new UnauthorizedException("Invalid or expired Supabase session");
    return token;
  }

  @Get("sources")
  sources() {
    return this.service.sources();
  }

  @Get("content")
  async list(
    @Headers("authorization") authorization: string | undefined,
    @Query("type") type?: CanonicalAdventistContentType,
    @Query("language") language?: string,
  ) {
    const token = await this.token(authorization);
    return this.service.list(token, type, language);
  }

  @Get("content/:id")
  async get(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    const token = await this.token(authorization);
    return this.service.get(token, id);
  }
}
