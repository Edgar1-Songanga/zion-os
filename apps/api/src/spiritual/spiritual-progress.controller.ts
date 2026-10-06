import { Body, Controller, Get, Headers, Param, Post, Query, UnauthorizedException } from "@nestjs/common";
import { getSupabaseUser } from "../identity/infrastructure/supabase-auth.client";
import { DevotionService } from "./devotion/devotion.service";
import type { DevotionEntry } from "./devotion/devotion.types";
import { GrowthService } from "./growth/growth.service";
import type { GrowthEvent } from "./growth/growth.types";

@Controller("v1/spiritual")
export class SpiritualProgressController {
  constructor(
    private readonly devotion: DevotionService,
    private readonly growth: GrowthService,
  ) {}

  private token(value?: string): string {
    const token = value?.replace(/^Bearer\s+/i, "").trim();
    if (!token) throw new UnauthorizedException("Bearer token is required");
    return token;
  }

  private async actor(authorization?: string) {
    const token = this.token(authorization);
    const user = await getSupabaseUser(token);
    if (!user) throw new UnauthorizedException("Invalid or expired Supabase session");
    return { token, user };
  }

  @Get("devotion")
  async listDevotions(
    @Headers("authorization") authorization: string | undefined,
    @Query("limit") limit?: string,
  ) {
    const { token, user } = await this.actor(authorization);
    return this.devotion.list(token, user.id, Number(limit) || 50);
  }

  @Get("devotion/:id")
  async getDevotion(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
  ) {
    const { token } = await this.actor(authorization);
    return this.devotion.get(token, id);
  }

  @Post("devotion")
  async completeDevotion(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: Omit<DevotionEntry, "id" | "completedAt">,
  ) {
    const { token, user } = await this.actor(authorization);
    return this.devotion.complete(token, { ...body, userId: user.id });
  }

  @Get("growth")
  async growthSnapshot(
    @Headers("authorization") authorization: string | undefined,
    @Query("period") period = "all",
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const { token, user } = await this.actor(authorization);
    return this.growth.snapshot(token, user.id, period, from, to);
  }

  @Post("growth")
  async recordGrowth(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: Omit<GrowthEvent, "id" | "occurredAt">,
  ) {
    const { token, user } = await this.actor(authorization);
    return this.growth.record(token, { ...body, userId: user.id });
  }
}
