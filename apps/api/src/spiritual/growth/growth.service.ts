import { Injectable, Inject, Optional } from "@nestjs/common";
import type { GrowthEvent, GrowthRepository, GrowthSnapshot } from "./growth.types";

export const GROWTH_REPOSITORY = Symbol("GROWTH_REPOSITORY");

@Injectable()
export class GrowthService {
  constructor(
    @Optional() @Inject(GROWTH_REPOSITORY)
    private readonly repository?: GrowthRepository,
  ) {}

  async record(input: Omit<GrowthEvent, "id" | "occurredAt">): Promise<GrowthEvent> {
    if (!input.userId || !input.source) throw new Error("Growth events require user and source.");
    const event: GrowthEvent = {
      ...input,
      id: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
    };
    if (!this.repository) throw new Error("Growth persistence is not configured.");
    return this.repository.record(event);
  }

  async snapshot(userId: string, period: string, from?: string, to?: string): Promise<GrowthSnapshot> {
    if (!userId || !period) throw new Error("Growth snapshot requires user and period.");
    if (!this.repository) throw new Error("Growth persistence is not configured.");
    const events = await this.repository.listForUser(userId, from, to);
    return { userId, period, events };
  }
}