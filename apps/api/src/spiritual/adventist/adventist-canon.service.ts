import { Inject, Injectable, Optional } from "@nestjs/common";
import {
  ADVENTIST_CANONICAL_SOURCES,
  AdventistCanonicalRecord,
  AdventistCanonRepository,
  CanonicalAdventistContentType,
  CanonicalSource,
} from "./adventist-canon.types";

export const ADVENTIST_CANON_REPOSITORY = Symbol("ADVENTIST_CANON_REPOSITORY");

@Injectable()
export class AdventistCanonService {
  constructor(
    @Optional()
    @Inject(ADVENTIST_CANON_REPOSITORY)
    private readonly repository?: AdventistCanonRepository,
  ) {}

  sources(): CanonicalSource[] {
    return ADVENTIST_CANONICAL_SOURCES;
  }

  async get(id: string): Promise<AdventistCanonicalRecord | null> {
    if (!this.repository) return null;
    return this.repository.getById(id);
  }

  async list(type?: CanonicalAdventistContentType, language?: string): Promise<AdventistCanonicalRecord[]> {
    if (!this.repository) return [];
    return this.repository.list(type, language);
  }
}