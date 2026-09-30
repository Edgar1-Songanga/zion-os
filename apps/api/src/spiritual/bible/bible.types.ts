export interface BibleReference {
  book: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
}

export interface BibleSearchResult {
  reference: BibleReference;
  text: string;
  translation: string;
  relevance: number;
}

export interface BibleProvider {
  get(
    reference: BibleReference,
    translation: string,
  ): Promise<BibleSearchResult | null>;

  search(
    query: string,
    translation: string,
  ): Promise<BibleSearchResult[]>;
}

export interface BibleServicePort {
  get(
    reference: BibleReference,
    translation?: string,
  ): Promise<BibleSearchResult | null>;

  search(
    query: string,
    translation?: string,
  ): Promise<BibleSearchResult[]>;
}
