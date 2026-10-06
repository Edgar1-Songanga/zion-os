import { Injectable } from "@nestjs/common";
import { SupabaseRestClient } from "../../common/supabase/supabase-rest.client";
import type { DevotionEntry, DevotionProvider } from "./devotion.types";

type DevotionRow = {
  id: string;
  user_id: string;
  title: string;
  scripture_references: string[];
  reflection: string;
  prayer: string | null;
  completed_at: string;
};

@Injectable()
export class SupabaseDevotionProvider implements DevotionProvider {
  constructor(private readonly db: SupabaseRestClient) {}

  async save(token: string, entry: DevotionEntry): Promise<DevotionEntry> {
    const rows = await this.db.post<DevotionRow[]>("spiritual_devotions", token, {
      id: entry.id,
      user_id: entry.userId,
      title: entry.title,
      scripture_references: entry.scriptureReferences,
      reflection: entry.reflection,
      prayer: entry.prayer ?? null,
      completed_at: entry.completedAt,
    });
    return this.map(rows[0]);
  }

  async getById(token: string, id: string): Promise<DevotionEntry | null> {
    const rows = await this.db.get<DevotionRow[]>(
      "spiritual_devotions",
      token,
      `?id=eq.${encodeURIComponent(id)}&limit=1`,
    );
    return rows[0] ? this.map(rows[0]) : null;
  }

  async listForUser(token: string, userId: string, limit = 50): Promise<DevotionEntry[]> {
    const rows = await this.db.get<DevotionRow[]>(
      "spiritual_devotions",
      token,
      `?user_id=eq.${encodeURIComponent(userId)}&order=completed_at.desc&limit=${Math.min(Math.max(limit, 1), 100)}`,
    );
    return rows.map((row) => this.map(row));
  }

  private map(row: DevotionRow): DevotionEntry {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      scriptureReferences: row.scripture_references,
      reflection: row.reflection,
      prayer: row.prayer ?? undefined,
      completedAt: row.completed_at,
    };
  }
}
