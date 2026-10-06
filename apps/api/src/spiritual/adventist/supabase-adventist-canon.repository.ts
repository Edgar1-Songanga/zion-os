import { Injectable } from "@nestjs/common";
import { env, assertSupabaseConfig } from "../../config/env";
import { SupabaseRestClient } from "../../common/supabase/supabase-rest.client";
import type { AdventistCanonicalRecord, AdventistCanonRepository, CanonicalAdventistContentType, ContentAuthority, ContentRights } from "./adventist-canon.types";

type CanonicalRow = {
  id: string; type: CanonicalAdventistContentType; title: string; summary?: string | null; status: AdventistCanonicalRecord["status"];
  language: string; authority: ContentAuthority; source_id: string; source_url: string; rights: ContentRights;
  bible_references?: string[] | null; tags?: string[] | null; related_content_ids?: string[] | null;
};

@Injectable()
export class SupabaseAdventistCanonRepository implements AdventistCanonRepository {
  constructor(private readonly db: SupabaseRestClient) {}

  async getById(id: string): Promise<AdventistCanonicalRecord | null> {
    assertSupabaseConfig();
    const rows = await this.db.get<CanonicalRow[]>(
      "spiritual_adventist_canonical_content", env.supabasePublishableKey,
      `?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
    );
    return rows[0] ? this.map(rows[0]) : null;
  }

  async list(type?: CanonicalAdventistContentType, language?: string): Promise<AdventistCanonicalRecord[]> {
    assertSupabaseConfig();
    const filters: string[] = ["select=*"];
    if (type) filters.push(`type=eq.${encodeURIComponent(type)}`);
    if (language) filters.push(`language=eq.${encodeURIComponent(language)}`);
    filters.push("order=title.asc");
    const rows = await this.db.get<CanonicalRow[]>(
      "spiritual_adventist_canonical_content", env.supabasePublishableKey, `?${filters.join("&")}`,
    );
    return rows.map((row) => this.map(row));
  }

  private map(row: CanonicalRow): AdventistCanonicalRecord {
    return {
      id: row.id, type: row.type, title: row.title, summary: row.summary ?? undefined, status: row.status,
      source: { id: row.source_id, title: row.title, url: row.source_url, authority: row.authority, language: row.language, rights: row.rights },
      bibleReferences: row.bible_references ?? [], tags: row.tags ?? [], relatedContentIds: row.related_content_ids ?? [],
    };
  }
}
