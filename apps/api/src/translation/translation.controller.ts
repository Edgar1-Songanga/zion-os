import { Body, Controller, Headers, Post, UnauthorizedException } from "@nestjs/common";
import { TranslationBatchRequest, TranslationRequest } from "@zion/translation-engine";
import { TranslationService } from "./translation.service";

@Controller("v1/translation")
export class TranslationController {
  constructor(private readonly translation: TranslationService) {}

  private token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, "").trim();
    if (!token) throw new UnauthorizedException("Bearer token is required");
    return token;
  }

  @Post("translate")
  translate(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: TranslationRequest,
  ) {
    return this.translation.translate(this.token(authorization), body);
  }

  @Post("translate/batch")
  translateBatch(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: TranslationBatchRequest,
  ) {
    return this.translation.translateBatch(this.token(authorization), body);
  }
}
