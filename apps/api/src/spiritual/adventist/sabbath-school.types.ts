export interface SabbathSchoolLesson {
  id: string;
  quarter: string;
  year: number;
  lessonNumber: number;
  title: string;
  language: string;
  memoryVerse?: string;
  bibleReferences: string[];
  dailySections: SabbathSchoolDailySection[];
  discussionQuestions: string[];
  teacherResourceUrl?: string;
  sourceUrl: string;
  rights: "licensed" | "permission_required" | "public_reference" | "unknown";
}

export interface SabbathSchoolDailySection {
  day: string;
  title: string;
  bibleReferences: string[];
  sourceUrl?: string;
}

export interface SabbathSchoolRepository {
  getById(id: string): Promise<SabbathSchoolLesson | null>;
  list(input?: { year?: number; quarter?: string; language?: string }): Promise<SabbathSchoolLesson[]>;
}