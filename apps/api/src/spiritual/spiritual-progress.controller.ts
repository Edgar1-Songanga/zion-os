import { Body, Controller, Get, Headers, Param, Post, Query, UnauthorizedException } from "@nestjs/common";
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

  @Get("devotion")
  listDevotions(
    @Headers("authorization") authorization: string | undefined,
    @Query("userId") userId: string,
    @Query("limit") limit?: string,
  ) {
    return this.devotion.list(this.token(authorization), userId, Number(limit) || 50);
  }

  @Get("devotion/:id")
  getDevotion(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
  ) {
    return this.devotion.get(this.token(authorization), id);
  }

  @Post("devotion")
  completeDevotion(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: Omit<DevotionEntry, "id" | "completedAt">,
  ) {
    return this.devotion.complete(this.token(authorization), body);
  }

  @Get("growth")
  growthSnapshot(
    @Headers("authorization") authorization: string | undefined,
    @Query("userId") userId: string,
    @Query("period") period = "all",
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.growth.snapshot(this.token(authorization), userId, period, from, to);
  }

  @Post("growth")
  recordGrowth(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: Omit<GrowthEvent, "id" | "occurredAt">,
  ) {
    return this.growth.record(this.token(authorization), body);
  }
}
