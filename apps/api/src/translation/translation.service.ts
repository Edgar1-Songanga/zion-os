import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import {
  AIGatewayTranslationProvider,
  TranslationBatchRequest,
  TranslationBatchResult,
  TranslationEngine,
  TranslationRequest,
  TranslationResult,
} from "@zion/translation-engine";
import { IdentityService } from "../identity/application/identity.service";
import { env } from "../config/env";

@Injectable()
export class TranslationService {
  constructor(private readonly identity: IdentityService) {}

  private engine(): TranslationEngine {
    if (!env.aiGatewayApiKey || !env.translationModel) {
      throw new ServiceUnavailableException("Translation provider is not configured");
    }

    return new TranslationEngine(
      new AIGatewayTranslationProvider({
        apiKey: env.aiGatewayApiKey,
        model: env.translationModel,
        endpoint: env.aiGatewayEndpoint || undefined,
      }),
    );
  }

  async translate(accessToken: string, request: TranslationRequest): Promise<TranslationResult> {
    await this.identity.getCurrentUser(accessToken);
    return this.engine().translate(request);
  }

  async translateBatch(accessToken: string, request: TranslationBatchRequest): Promise<TranslationBatchResult> {
    await this.identity.getCurrentUser(accessToken);
    return this.engine().translateBatch(request);
  }
}
