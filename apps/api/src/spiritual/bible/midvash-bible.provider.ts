import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { BibleProvider, BibleReference, BibleSearchResult } from "./bible.types";

type MidvashResponse = {
  data?: {
    version?: string;
    bookName?: string;
    chapter?: number;
    verse?: number;
    verseEnd?: number;
    text?: string;
    verses?: string[];
  };
  meta?: {
    copyright?: string;
    reference?: string;
  };
};

@Injectable()
export class MidvashBibleProvider implements BibleProvider {
  private readonly baseUrl = "https://api.midvash.com/v1";

  async get(reference: BibleReference, translation: string): Promise<BibleSearchResult | null> {
    const version = this.normalizeVersion(translation);
    const book = encodeURIComponent(reference.book.trim());
    const chapter = reference.chapter;
    const verse = reference.verseStart
      ? reference.verseEnd && reference.verseEnd !== reference.verseStart
        ? `${reference.verseStart}-${reference.verseEnd}`
        : String(reference.verseStart)
      : undefined;

    const path = verse
      ? `/${version}/${book}/${chapter}/${verse}`
      : `/${version}/${book}/${chapter}`;

    const payload = await this.request<MidvashResponse>(path);
    if (!payload.data?.text) return null;

    return {
      reference: {
        ...reference,
        verseStart: reference.verseStart ?? (payload.data.verses?.length ? 1 : payload.data.verse),
        verseEnd: reference.verseEnd ?? (payload.data.verses?.length ? payload.data.verseEnd : undefined),
      },
      text: payload.data.text,
      verses: Array.isArray(payload.data.verses) ? payload.data.verses : undefined,
      translation: payload.data.version ?? version,
      relevance: 1,
      copyright: payload.meta?.copyright,
    };
  }

  async search(query: string, translation: string): Promise<BibleSearchResult[]> {
    const normalized = query.trim();
    if (!normalized) return [];

    // The upstream open API exposes reference parsing rather than server-side
    // full-text search. Resolve references instead of inventing topical results.
    const parsed = await this.request<{
      data?: {
        book_slug?: string;
        chapter?: number;
        verse_start?: number | null;
        verse_end?: number | null;
      };
    }>(`/parse?q=${encodeURIComponent(normalized)}&version=${this.normalizeVersion(translation)}`);

    if (!parsed.data?.book_slug || !parsed.data.chapter) return [];

    const result = await this.get(
      {
        book: parsed.data.book_slug,
        chapter: parsed.data.chapter,
        verseStart: parsed.data.verse_start ?? undefined,
        verseEnd: parsed.data.verse_end ?? undefined,
      },
      translation,
    );

    return result ? [result] : [];
  }

  private normalizeVersion(translation: string): string {
    const normalized = translation.trim().toLowerCase();
    const aliases: Record<string, string> = {
      almeida: "almeida-livre",
      "almeida-livre": "almeida-livre",
      "almeida 1819": "almeida-livre",
      kjv: "kjv",
      web: "web",
    };
    return aliases[normalized] ?? normalized;
  }

  private async request<T>(path: string): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const payload = (await response.json()) as T & { error?: { message?: string } };

      if (!response.ok) {
        throw new Error(payload.error?.message ?? `Bible provider returned HTTP ${response.status}`);
      }

      return payload;
    } catch (error) {
      throw new ServiceUnavailableException(
        error instanceof Error
          ? `Serviço bíblico indisponível: ${error.message}`
          : "Serviço bíblico indisponível.",
      );
    }
  }
}
