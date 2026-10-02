import { Inject, Injectable, Optional } from "@nestjs/common";
import type { SabbathSchoolLesson, SabbathSchoolRepository } from "./sabbath-school.types";

export const SABBATH_SCHOOL_REPOSITORY = Symbol("SABBATH_SCHOOL_REPOSITORY");

@Injectable()
export class SabbathSchoolService {
  constructor(
    @Optional()
    @Inject(SABBATH_SCHOOL_REPOSITORY)
    private readonly repository?: SabbathSchoolRepository,
  ) {}

  async get(id: string): Promise<SabbathSchoolLesson | null> {
    if (!this.repository) return null;
    return this.repository.getById(id);
  }

  async list(input: { year?: number; quarter?: string; language?: string } = {}) {
    if (!this.repository) return [];
    return this.repository.list(input);
  }
}
