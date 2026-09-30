export interface SpiritualChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface SpiritualContext {
  locale?: string;
  bibleReferences?: string[];
  ministryContext?: string;
  organizationId?: string;
}

export interface SpiritualChatProvider {
  answer(messages: readonly SpiritualChatMessage[], context: SpiritualContext): Promise<{
    content: string;
    references: string[];
  }>;
}
