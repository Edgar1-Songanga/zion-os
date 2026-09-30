import type { BibleProvider, BibleReference, BibleSearchResult } from "./types";

export class BibleEngine {
  constructor(private readonly provider: BibleProvider) {}

  get(reference: BibleReference, translation = "KJV"): Promise<BibleSearchResult | null> {
    if (reference.chapter < 1) throw new Error("Bible chapter must be positive.");
    if (reference.verseStart !== undefined && reference.verseStart < 1) {
      throw new Error("Bible verse must be positive.");
    }
    if (reference.verseEnd !== undefined && reference.verseStart !== undefined && reference.verseEnd < reference.verseStart) {
      throw new Error("Bible verse range is invalid.");
    }
    return this.provider.get(reference, translation);
  }

  search(query: string, translation = "KJV"): Promise<BibleSearchResult[]> {
    const normalized = query.trim();
    if (normalized.length < 2) return Promise.resolve([]);
    return this.provider.search(normalized, translation);
  }
}
