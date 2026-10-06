import { Injectable } from "@nestjs/common";
import { SupabaseRestClient } from "../../common/supabase/supabase-rest.client";
import type { SabbathSchoolLesson, SabbathSchoolRepository } from "./sabbath-school.types";

type SabbathSchoolRow = SabbathSchoolLesson;

@Injectable()
export class SupabaseSabbathSchoolRepository implements SabbathSchoolRepository {
  constructor(private readonly db: SupabaseRestClient) {}

  async getById(id: string): Promise<SabbathSchoolLesson | null> {
    const rows = await this.db.get<SabbathSchoolRow[]>(
      "spiritual_sabbath_school_lessons",
      this.readToken,
      `?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
    );
    return rows[0] ? this.map(rows[0]) : null;
  }

  async list(input: { year?: number; quarter?: string; language?: string } = {}): Promise<SabbathSchoolLesson[]> {
    const filters: string[] = ["select=*"];
    if (input.year !== undefined) filters.push(`year=eq.${encodeURIComponent(String(input.year))}`);
    if (input.quarter) filters.push(`quarter=eq.${encodeURIComponent(input.quarter)}`);
    if (input.language) filters.push(`language=eq.${encodeURIComponent(input.language)}`);
    filters.push("order=year.desc,lesson_number.asc");
    const rows = await this.db.get<SabbathSchoolRow[]>(
      "spiritual_sabbath_school_lessons",
      this.readToken,
      `?${filters.join("&")}`,
    );
    return rows.map((row) => this.map(row));
  }

  private readonly readToken = "authenticated";
  private map(row: SabbathSchoolRow): SabbathSchoolLesson {
    return {
      ...row,
      bibleReferences: row.bibleReferences ?? [],
      dailySections: row.dailySections ?? [],
      discussionQuestions: row.discussionQuestions ?? [],
    };
  }
}
