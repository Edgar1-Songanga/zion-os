export interface BibleReference {
  book: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
}

export interface BibleSearchResult {
  reference: BibleReference;
  text: string;
  verses?: string[];
  translation: string;
  relevance: number;
  copyright?: string;
}

export interface BibleProvider {
  get(reference: BibleReference, translation: string): Promise<BibleSearchResult | null>;
  search(query: string, translation: string): Promise<BibleSearchResult[]>;
}
