import { Injectable } from "@nestjs/common";
import { GamificationEngine } from "../../../../services/gamification-engine/src/gamification-engine";
import type { AwardEvent, GamificationAction, UserProgress } from "../../../../services/gamification-engine/src/types";
import { SupabaseRestClient } from "../common/supabase/supabase-rest.client";

type GrowthRow = { id: string; area: string; source: string; occurred_at: string; metadata: Record<string, unknown> | null };

const ACTION_BY_AREA: Record<string, GamificationAction> = {
  bible: "bible_read",
  prayer: "prayer_completed",
  devotion: "devotion_completed",
  service: "service_completed",
  community: "community_contribution",
  leadership: "leadership_activity",
};

@Injectable()
export class GamificationService {
  constructor(private readonly db: SupabaseRestClient) {}

  async me(token: string, userId: string) {
    const rows = await this.db.get<GrowthRow[]>(
      "spiritual_growth_events",
      token,
      "?user_id=eq." + encodeURIComponent(userId) + "&order=occurred_at.asc&limit=500",
    );

    const engine = new GamificationEngine();
    let progress: UserProgress = { userId, points: 0, level: 1, events: [] };

    for (const row of rows) {
      const action = this.actionFor(row);
      if (!action) continue;
      progress = engine.award(userId, action, progress, {
        source: row.source,
        growthEventId: row.id,
        ...(row.metadata ?? {}),
      });
    }

    const nextLevel = progress.level + 1;
    const minimumForNextLevel = Math.pow(nextLevel - 1, 2) * 100;

    return {
      userId,
      points: progress.points,
      level: progress.level,
      nextLevel,
      pointsToNextLevel: Math.max(0, minimumForNextLevel - progress.points),
      events: progress.events,
    };
  }

  private actionFor(row: GrowthRow): GamificationAction | null {
    if (row.source.toLowerCase().includes("study")) return "study_completed";
    return ACTION_BY_AREA[row.area] ?? null;
  }
}
