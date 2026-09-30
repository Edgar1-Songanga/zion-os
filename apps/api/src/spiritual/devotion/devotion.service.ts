import { Injectable, Inject, Optional } from "@nestjs/common";
import type { DevotionEntry, DevotionProvider } from "./devotion.types";

export const DEVOTION_PROVIDER = Symbol("DEVOTION_PROVIDER");

@Injectable()
export class DevotionService {
  constructor(
    @Optional() @Inject(DEVOTION_PROVIDER)
    private readonly provider?: DevotionProvider,
  ) {}

  async complete(input: Omit<DevotionEntry, "id" | "completedAt">): Promise<DevotionEntry> {
    if (!input.userId || !input.title.trim() || !input.reflection.trim()) {
      throw new Error("A completed devotion requires user, title and reflection.");
    }
    const entry: DevotionEntry = {
      ...input,
      id: crypto.randomUUID(),
      title: input.title.trim(),
      reflection: input.reflection.trim(),
      completedAt: new Date().toISOString(),
    };
    return this.provider ? this.provider.save(entry) : entry;
  }
}