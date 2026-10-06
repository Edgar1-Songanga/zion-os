import { BadRequestException, Inject, Injectable, Optional, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import type { DevotionEntry, DevotionProvider } from "./devotion.types";

export const DEVOTION_PROVIDER = Symbol("DEVOTION_PROVIDER");

@Injectable()
export class DevotionService {
  constructor(
    @Optional() @Inject(DEVOTION_PROVIDER)
    private readonly provider?: DevotionProvider,
  ) {}

  async complete(token: string, input: Omit<DevotionEntry, "id" | "completedAt">): Promise<DevotionEntry> {
    if (!token) throw new UnauthorizedException("Authentication is required.");
    if (!input?.userId || !input.title?.trim() || !input.reflection?.trim()) {
      throw new BadRequestException("A completed devotion requires user, title and reflection.");
    }

    const scriptureReferences = [...new Set(
      (input.scriptureReferences ?? [])
        .map((reference) => reference.trim())
        .filter(Boolean),
    )];

    if (!scriptureReferences.length) {
      throw new BadRequestException("A devotion requires at least one scripture reference.");
    }

    const entry: DevotionEntry = {
      ...input,
      id: crypto.randomUUID(),
      title: input.title.trim(),
      reflection: input.reflection.trim(),
      scriptureReferences,
      prayer: input.prayer?.trim() || undefined,
      completedAt: new Date().toISOString(),
    };

    if (!this.provider) {
      throw new ServiceUnavailableException("Devotion persistence is not configured.");
    }

    return this.provider.save(token, entry);
  }

  async get(token: string, id: string): Promise<DevotionEntry | null> {
    if (!token) throw new UnauthorizedException("Authentication is required.");
    if (!id) throw new BadRequestException("Devotion id is required.");
    if (!this.provider) {
      throw new ServiceUnavailableException("Devotion persistence is not configured.");
    }
    return this.provider.getById(token, id);
  }

  async list(token: string, userId: string, limit = 50): Promise<DevotionEntry[]> {
    if (!token) throw new UnauthorizedException("Authentication is required.");
    if (!userId) throw new BadRequestException("User id is required.");
    if (!this.provider) {
      throw new ServiceUnavailableException("Devotion persistence is not configured.");
    }
    return this.provider.listForUser(token, userId, Math.min(Math.max(limit, 1), 100));
  }
}
