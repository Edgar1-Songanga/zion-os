import { Injectable } from "@nestjs/common";
import { env, assertSupabaseConfig } from "../../config/env";
import { SupabaseRestClient } from "../../common/supabase/supabase-rest.client";
import type { SabbathSchoolLesson, SabbathSchoolRepository } from "./sabbath-school.types";

type SabbathSchoolRow = {
  id: string; quarter: string; year: number; lesson_number: number; title: string; language: string;
  memory_verse?: string | null; bible_references?: string[] | null; daily_sections?: SabbathSchoolLesson["dailySections"] | null;
  discussion_questions?: string[] | null; teacher_resource_url?: string | null; source_url: string;
  rights: SabbathSchoolLesson["rights"];
};

@Injectable()
export class SupabaseSabbathSchoolRepository implements SabbathSchoolRepository {
  constructor(private readonly db: SupabaseRestClient) {}

  async getById(id: string): Promise<SabbathSchoolLesson | null> {
    assertSupabaseConfig();
    const rows = await this.db.get<SabbathSchoolRow[]>(
      "spiritual_sabbath_school_lessons", env.supabasePublishableKey,
      `?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
    );
    return rows[0] ? this.map(rows[0]) : null;
  }

  async list(input: { year?: number; quarter?: string; language?: string } = {}): Promise<SabbathSchoolLesson[]> {
    assertSupabaseConfig();
    const filters: string[] = ["select=*"];
    if (input.year !== undefined) filters.push(`year=eq.${encodeURIComponent(String(input.year))}`);
    if (input.quarter) filters.push(`quarter=eq.${encodeURIComponent(input.quarter)}`);
    if (input.language) filters.push(`language=eq.${encodeURIComponent(input.language)}`);
    filters.push("order=year.desc,lesson_number.asc");
    const rows = await this.db.get<SabbathSchoolRow[]>(
      "spiritual_sabbath_school_lessons", env.supabasePublishableKey, `?${filters.join("&")}`,
    );
    return rows.map((row) => this.map(row));
  }

  private map(row: SabbathSchoolRow): SabbathSchoolLesson {
    return {
      id: row.id, quarter: row.quarter, year: row.year, lessonNumber: row.lesson_number,
      title: row.title, language: row.language, memoryVerse: row.memory_verse ?? undefined,
      bibleReferences: row.bible_references ?? [], dailySections: row.daily_sections ?? [],
      discussionQuestions: row.discussion_questions ?? [],
      teacherResourceUrl: row.teacher_resource_url ?? undefined, sourceUrl: row.source_url, rights: row.rights,
    };
  }
}
