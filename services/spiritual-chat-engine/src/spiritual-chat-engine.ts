import type { SpiritualChatMessage, SpiritualChatProvider, SpiritualContext } from "./types";

export class SpiritualChatEngine {
  constructor(private readonly provider: SpiritualChatProvider) {}

  async answer(
    messages: readonly SpiritualChatMessage[],
    context: SpiritualContext = {},
  ) {
    const last = [...messages].reverse().find((message) => message.role === "user");
    if (!last?.content.trim()) throw new Error("A user message is required.");
    return this.provider.answer(messages, context);
  }
}
