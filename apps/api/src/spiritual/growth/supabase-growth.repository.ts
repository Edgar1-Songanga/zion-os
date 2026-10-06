import { Injectable } from "@nestjs/common";
import { SupabaseRestClient } from "../../common/supabase/supabase-rest.client";
import type { GrowthEvent, GrowthRepository } from "./growth.types";

type GrowthRow = {
  id: string;
  user_id: string;
  area: GrowthEvent["area"];
  source: string;
  occurred_at: string;
  metadata: Record<string, unknown>;
};

@Injectable()
export class SupabaseGrowthRepository implements GrowthRepository {
  constructor(private readonly db: SupabaseRestClient) {}

  async record(token: string, event: GrowthEvent): Promise<GrowthEvent> {
    const rows = await this.db.post<GrowthRow[]>("spiritual_growth_events", token, {
      id: event.id,
      user_id: event.userId,
      area: event.area,
      source: event.source,
      occurred_at: event.occurredAt,
      metadata: event.metadata ?? {},
    });
    return this.map(rows[0]);
  }

  async listForUser(token: string, userId: string, from?: string, to?: string): Promise<GrowthEvent[]> {
    const filters = [
      `user_id=eq.${encodeURIComponent(userId)}`,
      "order=occurred_at.desc",
      "limit=200",
    ];
    if (from) filters.push(`occurred_at=gte.${encodeURIComponent(from)}`);
    if (to) filters.push(`occurred_at=lte.${encodeURIComponent(to)}`);
    const rows = await this.db.get<GrowthRow[]>("spiritual_growth_events", token, `?${filters.join("&")}`);
    return rows.map((row) => this.map(row));
  }

  private map(row: GrowthRow): GrowthEvent {
    return {
      id: row.id,
      userId: row.user_id,
      area: row.area,
      source: row.source,
      occurredAt: row.occurred_at,
      metadata: row.metadata ?? {},
    };
  }
}
