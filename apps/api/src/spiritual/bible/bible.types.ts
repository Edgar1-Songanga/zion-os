export interface BibleReference {
  book: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
}

export interface BibleSearchResult {
  reference: BibleReference;
  text: string;
  /** Individual verse texts, numbered from reference.verseStart or verse 1. */
  verses?: string[];
  translation: string;
  relevance: number;
  copyright?: string;
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
