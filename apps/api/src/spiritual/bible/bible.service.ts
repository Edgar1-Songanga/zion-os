import { Inject, Injectable, Optional } from "@nestjs/common";
import type {
  BibleProvider,
  BibleReference,
  BibleSearchResult,
  BibleServicePort,
} from "./bible.types";

export const BIBLE_PROVIDER = Symbol("BIBLE_PROVIDER");
const DEFAULT_TRANSLATION = "KJV";

@Injectable()
export class BibleService implements BibleServicePort {
  constructor(
    @Optional() @Inject(BIBLE_PROVIDER)
    private readonly provider?: BibleProvider,
  ) {}

  async get(reference: BibleReference, translation = DEFAULT_TRANSLATION): Promise<BibleSearchResult | null> {
    this.validateReference(reference);
    const provider = this.providerOrThrow();
    return provider.get(reference, this.normalizeTranslation(translation));
  }

  async search(query: string, translation = DEFAULT_TRANSLATION): Promise<BibleSearchResult[]> {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) return [];
    const provider = this.providerOrThrow();
    return provider.search(normalizedQuery, this.normalizeTranslation(translation));
  }

  private providerOrThrow(): BibleProvider {
    if (!this.provider) throw new Error("Bible provider is not configured.");
    return this.provider;
  }

  private normalizeTranslation(translation: string): string {
    const normalized = translation.trim().toUpperCase();
    if (!normalized) throw new Error("Bible translation is required.");
    if (normalized.length > 32) throw new Error("Bible translation is too long.");
    return normalized;
  }

  private validateReference(reference: BibleReference): void {
    const book = reference.book.trim();
    if (!book) throw new Error("Bible book is required.");
    if (!Number.isInteger(reference.chapter) || reference.chapter < 1) throw new Error("Bible chapter must be positive.");
    if (reference.verseStart !== undefined && (!Number.isInteger(reference.verseStart) || reference.verseStart < 1)) {
      throw new Error("Bible verse must be positive.");
    }
    if (reference.verseEnd !== undefined && (!Number.isInteger(reference.verseEnd) || reference.verseEnd < 1)) {
      throw new Error("Bible ending verse must be positive.");
    }
    if (reference.verseEnd !== undefined && reference.verseStart !== undefined && reference.verseEnd < reference.verseStart) {
      throw new Error("Bible verse range is invalid.");
    }
  }
}
