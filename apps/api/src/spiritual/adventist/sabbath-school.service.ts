import { Inject, Injectable } from "@nestjs/common";
import type { SabbathSchoolLesson, SabbathSchoolRepository } from "./sabbath-school.types";

export const SABBATH_SCHOOL_REPOSITORY = Symbol("SABBATH_SCHOOL_REPOSITORY");

@Injectable()
export class SabbathSchoolService {
  constructor(@Inject(SABBATH_SCHOOL_REPOSITORY) private readonly repository: SabbathSchoolRepository) {}

  get(token: string, id: string): Promise<SabbathSchoolLesson | null> {
    return this.repository.getById(token, id);
  }

  list(token: string, input: { year?: number; quarter?: string; language?: string } = {}) {
    return this.repository.list(token, input);
  }
}
