import { Controller, Get, Headers, Param, Query, UnauthorizedException } from "@nestjs/common";
import { getSupabaseUser } from "../../identity/infrastructure/supabase-auth.client";
import { SabbathSchoolService } from "./sabbath-school.service";

@Controller("v1/spiritual/sabbath-school")
export class SabbathSchoolController {
  constructor(private readonly service: SabbathSchoolService) {}

  private async token(authorization?: string): Promise<string> {
    const token = authorization?.replace(/^Bearer\s+/i, "").trim();
    if (!token) throw new UnauthorizedException("Bearer token is required");
    const user = await getSupabaseUser(token);
    if (!user) throw new UnauthorizedException("Invalid or expired Supabase session");
    return token;
  }

  @Get()
  async list(
    @Headers("authorization") authorization: string | undefined,
    @Query("year") year?: string,
    @Query("quarter") quarter?: string,
    @Query("language") language?: string,
  ) {
    const token = await this.token(authorization);
    return this.service.list(token, { year: year ? Number(year) : undefined, quarter, language });
  }

  @Get(":id")
  async get(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    const token = await this.token(authorization);
    return this.service.get(token, id);
  }
}
