import { Injectable } from "@nestjs/common";
import type { DevotionEntry, DevotionProvider } from "./devotion.types";

@Injectable()
export class DevotionService {
  constructor(private readonly provider?: DevotionProvider) {}

  async complete(input: Omit<DevotionEntry, "id" | "completedAt">): Promise<DevotionEntry> {
    if (!input.userId || !input.title.trim() || !input.reflection.trim()) throw new Error("A completed devotion requires user, title and reflection.");
    const entry: DevotionEntry = { ...input, id: crypto.randomUUID(), title: input.title.trim(), reflection: input.reflection.trim(), completedAt: new Date().toISOString() };
    if (this.provider) return this.provider.save(entry);
    return entry;
  }
}