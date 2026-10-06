import { Injectable } from "@nestjs/common";
import { SupabaseRestClient } from "../../common/supabase/supabase-rest.client";
import type {
  AdventistCanonicalRecord,
  AdventistCanonRepository,
  CanonicalAdventistContentType,
} from "./adventist-canon.types";

type CanonicalRow = AdventistCanonicalRecord;

@Injectable()
export class SupabaseAdventistCanonRepository implements AdventistCanonRepository {
  constructor(private readonly db: SupabaseRestClient) {}

  async getById(id: string): Promise<AdventistCanonicalRecord | null> {
    const rows = await this.db.get<CanonicalRow[]>(
      "spiritual_adventist_canonical_content",
      this.readToken,
      `?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
    );
    return rows[0] ? this.map(rows[0]) : null;
  }

  async list(type?: CanonicalAdventistContentType, language?: string): Promise<AdventistCanonicalRecord[]> {
    const filters: string[] = ["select=*"];
    if (type) filters.push(`type=eq.${encodeURIComponent(type)}`);
    if (language) filters.push(`language=eq.${encodeURIComponent(language)}`);
    filters.push("order=title.asc");
    const rows = await this.db.get<CanonicalRow[]>(
      "spiritual_adventist_canonical_content",
      this.readToken,
      `?${filters.join("&")}`,
    );
    return rows.map((row) => this.map(row));
  }

  private readonly readToken = "authenticated";
  private map(row: CanonicalRow): AdventistCanonicalRecord {
    return {
      ...row,
      bibleReferences: row.bibleReferences ?? [],
      tags: row.tags ?? [],
      relatedContentIds: row.relatedContentIds ?? [],
    };
  }
}
