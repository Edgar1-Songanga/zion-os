import type { SpiritualChatMessage, SpiritualChatProvider, SpiritualContext } from "./types";
import { classifySpiritualIntent, recommendSpiritualNextSteps, type SpiritualIntelligenceContext } from "./intelligence";

export class SpiritualChatEngine {
  constructor(private readonly provider: SpiritualChatProvider) {}

  async answer(messages: readonly SpiritualChatMessage[], context: SpiritualContext = {}) {
    const last = [...messages].reverse().find((message) => message.role === "user");
    if (!last?.content.trim()) throw new Error("A user message is required.");
    return this.provider.answer(messages, context);
  }

  async answerIntelligently(
    messages: readonly SpiritualChatMessage[],
    context: SpiritualIntelligenceContext = {},
  ) {
    const last = [...messages].reverse().find((message) => message.role === "user");
    if (!last?.content.trim()) throw new Error("A user message is required.");

    const intent = classifySpiritualIntent(last.content);
    const recommendations = recommendSpiritualNextSteps(intent.intent, context);
    const answer = await this.provider.answer(messages, context);

    return {
      ...answer,
      intelligence: { ...intent, recommendations },
      aiEnhanced: false,
      reasoningMode: "provider" as const,
    };
  }
}
