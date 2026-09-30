import { Controller, Get, Param, Query } from "@nestjs/common";
import { AdventistCanonService } from "./adventist-canon.service";
import { CanonicalAdventistContentType } from "./adventist-canon.types";

@Controller("v1/spiritual/adventist")
export class AdventistCanonController {
  constructor(private readonly service: AdventistCanonService) {}

  @Get("sources")
  sources() {
    return this.service.sources();
  }

  @Get("content")
  list(
    @Query("type") type?: CanonicalAdventistContentType,
    @Query("language") language?: string,
  ) {
    return this.service.list(type, language);
  }

  @Get("content/:id")
  get(@Param("id") id: string) {
    return this.service.get(id);
  }
}