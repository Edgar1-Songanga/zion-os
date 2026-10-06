import { Injectable, Inject, Optional } from "@nestjs/common";
import type { DevotionEntry, DevotionProvider } from "./devotion.types";

export const DEVOTION_PROVIDER = Symbol("DEVOTION_PROVIDER");

@Injectable()
export class DevotionService {
  constructor(
    @Optional() @Inject(DEVOTION_PROVIDER)
    private readonly provider?: DevotionProvider,
  ) {}

  async complete(token: string, input: Omit<DevotionEntry, "id" | "completedAt">): Promise<DevotionEntry> {
    if (!token || !input.userId || !input.title.trim() || !input.reflection.trim()) {
      throw new Error("A completed devotion requires authentication, user, title and reflection.");
    }
    const scriptureReferences = [...new Set(input.scriptureReferences.map((reference) => reference.trim()).filter(Boolean))];
    if (!scriptureReferences.length) throw new Error("A devotion requires at least one scripture reference.");

    const entry: DevotionEntry = {
      ...input,
      id: crypto.randomUUID(),
      title: input.title.trim(),
      reflection: input.reflection.trim(),
      scriptureReferences,
      prayer: input.prayer?.trim() || undefined,
      completedAt: new Date().toISOString(),
    };

    if (!this.provider) throw new Error("Devotion persistence is not configured.");
    return this.provider.save(token, entry);
  }

  async get(token: string, id: string): Promise<DevotionEntry | null> {
    if (!token || !id) throw new Error("Authentication and devotion id are required.");
    if (!this.provider) throw new Error("Devotion persistence is not configured.");
    return this.provider.getById(token, id);
  }

  async list(token: string, userId: string, limit = 50): Promise<DevotionEntry[]> {
    if (!token || !userId) throw new Error("Authentication and user id are required.");
    if (!this.provider) throw new Error("Devotion persistence is not configured.");
    return this.provider.listForUser(token, userId, Math.min(Math.max(limit, 1), 100));
  }
}
