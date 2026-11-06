import { BadRequestException, Body, Controller, Get, Headers, Param, Post, Put, Query, UnauthorizedException } from "@nestjs/common";
import { getSupabaseUser } from "../identity/infrastructure/supabase-auth.client";
import { DevotionService } from "./devotion/devotion.service";
import type { DevotionEntry } from "./devotion/devotion.types";
import { GrowthService } from "./growth/growth.service";
import { SupabaseRestClient } from "../common/supabase/supabase-rest.client";
import type { GrowthEvent } from "./growth/growth.types";

@Controller("v1/spiritual")
export class SpiritualProgressController {
  constructor(
    private readonly devotion: DevotionService,
    private readonly growth: GrowthService,
    private readonly db: SupabaseRestClient,
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

  @Get("bible-review")
  async listBibleReviewSchedule(@Headers("authorization") authorization: string | undefined) {
    const { token, user } = await this.actor(authorization);
    const rows = await this.db.get<Array<{
      question_id: number; due_at: string; interval_days: number; repetitions: number; updated_at: string;
    }>>(
      "spiritual_bible_review_schedule",
      token,
      "?user_id=eq." + encodeURIComponent(user.id) + "&order=updated_at.desc&limit=500",
    );
    return { items: rows.map((row) => ({
      questionId: row.question_id,
      dueAt: row.due_at,
      intervalDays: row.interval_days,
      repetitions: row.repetitions,
      updatedAt: row.updated_at,
    })) };
  }

  @Put("bible-review/:questionId")
  async saveBibleReviewSchedule(
    @Headers("authorization") authorization: string | undefined,
    @Param("questionId") questionIdParam: string,
    @Body() body: { dueAt?: string; intervalDays?: number; repetitions?: number },
  ) {
    const { token, user } = await this.actor(authorization);
    const questionId = Number(questionIdParam);
    const dueAt = typeof body?.dueAt === "string" ? new Date(body.dueAt) : null;
    const validIntervals = [1, 3, 7, 14, 30];
    if (!Number.isSafeInteger(questionId) || questionId < 1 || questionId > 10000
      || !dueAt || !Number.isFinite(dueAt.getTime())
      || !validIntervals.includes(Number(body?.intervalDays))
      || !Number.isSafeInteger(body?.repetitions) || Number(body.repetitions) < 0 || Number(body.repetitions) > 1000) {
      throw new BadRequestException("Invalid Bible review schedule.");
    }
    const updatedAt = new Date().toISOString();
    const rows = await this.db.upsert<Array<{
      question_id: number; due_at: string; interval_days: number; repetitions: number; updated_at: string;
    }>>(
      "spiritual_bible_review_schedule",
      token,
      {
        user_id: user.id,
        question_id: questionId,
        due_at: dueAt.toISOString(),
        interval_days: Number(body.intervalDays),
        repetitions: Number(body.repetitions),
        updated_at: updatedAt,
      },
      "?on_conflict=user_id,question_id",
    );
    const row = rows[0];
    return {
      questionId: row.question_id,
      dueAt: row.due_at,
      intervalDays: row.interval_days,
      repetitions: row.repetitions,
      updatedAt: row.updated_at,
    };
  }

  @Get("bible-challenge/progress")
  async getBibleChallengeProgress(@Headers("authorization") authorization: string | undefined) {
    const { token, user } = await this.actor(authorization);
    const rows = await this.db.get<Array<{ state: Record<string, unknown>; updated_at: string }>>(
      "spiritual_bible_challenge_progress",
      token,
      "?select=state,updated_at&user_id=eq." + encodeURIComponent(user.id) + "&limit=1",
    );
    return rows[0]
      ? { progress: rows[0].state, updatedAt: rows[0].updated_at }
      : { progress: null, updatedAt: null };
  }

  @Put("bible-challenge/progress")
  async saveBibleChallengeProgress(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: { progress?: Record<string, unknown> },
  ) {
    const { token, user } = await this.actor(authorization);
    const state = body?.progress;
    const integerInRange = (value: unknown, min: number, max: number) =>
      Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
    const validStringArray = (value: unknown, maxItems: number, maxLength: number) =>
      Array.isArray(value) && value.length <= maxItems
      && value.every((item) => typeof item === "string" && item.length <= maxLength);
    const validIdArray = (value: unknown) =>
      Array.isArray(value) && value.length <= 200
      && value.every((item) => integerInRange(item, 1, 10000));

    if (!state || typeof state !== "object" || Array.isArray(state)
      || state.schemaVersion !== 1
      || !integerInRange(state.levelIndex, 0, 5)
      || !integerInRange(state.questionIndex, 0, 200)
      || !integerInRange(state.totalScore, 0, 10000000)
      || !integerInRange(state.levelCorrect, 0, 200)
      || !integerInRange(state.currentStreak, 0, 200)
      || !integerInRange(state.bestStreak, 0, 200)
      || !["junior", "classic", "hyper"].includes(String(state.playMode))
      || !(state.selectedOption === null || (typeof state.selectedOption === "string" && state.selectedOption.length <= 500))
      || typeof state.levelFinished !== "boolean"
      || typeof state.hintUsed !== "boolean"
      || !validIdArray(state.missedQuestionIds)
      || !validIdArray(state.shuffledOrder)
      || !validStringArray(state.optionOrder, 10, 500)
      || !validStringArray(state.hiddenOptions, 10, 500)) {
      throw new BadRequestException("Invalid Bible Challenge progress payload.");
    }

    const rows = await this.db.upsert<Array<{ state: Record<string, unknown>; updated_at: string }>>(
      "spiritual_bible_challenge_progress",
      token,
      { user_id: user.id, state, updated_at: new Date().toISOString() },
      "?on_conflict=user_id",
    );
    return { progress: rows[0].state, updatedAt: rows[0].updated_at };
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
