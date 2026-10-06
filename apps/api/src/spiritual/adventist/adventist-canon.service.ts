import { Inject, Injectable } from "@nestjs/common";
import { ADVENTIST_CANONICAL_SOURCES } from "./adventist-canon.types";
import type { AdventistCanonicalRecord, AdventistCanonRepository, CanonicalAdventistContentType, CanonicalSource } from "./adventist-canon.types";

export const ADVENTIST_CANON_REPOSITORY = Symbol("ADVENTIST_CANON_REPOSITORY");

@Injectable()
export class AdventistCanonService {
  constructor(@Inject(ADVENTIST_CANON_REPOSITORY) private readonly repository: AdventistCanonRepository) {}

  sources(): CanonicalSource[] {
    return ADVENTIST_CANONICAL_SOURCES;
  }

  get(token: string, id: string): Promise<AdventistCanonicalRecord | null> {
    return this.repository.getById(token, id);
  }

  list(token: string, type?: CanonicalAdventistContentType, language?: string): Promise<AdventistCanonicalRecord[]> {
    return this.repository.list(token, type, language);
  }
}
