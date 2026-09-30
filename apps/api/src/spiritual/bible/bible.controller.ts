import { Controller, Get, Query } from "@nestjs/common";
import { BibleService } from "./bible.service";

@Controller("v1/spiritual/bible")
export class BibleController {
  constructor(private readonly bibleService: BibleService) {}

  @Get("search")
  search(
    @Query("q") query = "",
    @Query("translation") translation = "KJV",
  ) {
    return this.bibleService.search(query, translation);
  }

  @Get("passage")
  getPassage(
    @Query("book") book = "",
    @Query("chapter") chapter = "",
    @Query("verseStart") verseStart?: string,
    @Query("verseEnd") verseEnd?: string,
    @Query("translation") translation = "KJV",
  ) {
    const parsedChapter = Number(chapter);
    const parsedVerseStart =
      verseStart === undefined ? undefined : Number(verseStart);
    const parsedVerseEnd =
      verseEnd === undefined ? undefined : Number(verseEnd);

    return this.bibleService.get(
      {
        book,
        chapter: parsedChapter,
        verseStart: parsedVerseStart,
        verseEnd: parsedVerseEnd,
      },
      translation,
    );
  }
}
