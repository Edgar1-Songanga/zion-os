import { Controller, Get, Param, Query } from "@nestjs/common";
import { SabbathSchoolService } from "./sabbath-school.service";

@Controller("v1/spiritual/sabbath-school")
export class SabbathSchoolController {
  constructor(private readonly service: SabbathSchoolService) {}

  @Get()
  list(
    @Query("year") year?: string,
    @Query("quarter") quarter?: string,
    @Query("language") language?: string,
  ) {
    return this.service.list({
      year: year ? Number(year) : undefined,
      quarter,
      language,
    });
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.service.get(id);
  }
}