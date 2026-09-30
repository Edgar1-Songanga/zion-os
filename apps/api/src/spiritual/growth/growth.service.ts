import { Injectable } from "@nestjs/common";
import type { GrowthEvent, GrowthSnapshot } from "./growth.types";

@Injectable()
export class GrowthService {
  record(input: Omit<GrowthEvent, "id" | "occurredAt">): GrowthEvent {
    if (!input.userId || !input.source) throw new Error("Growth events require user and source.");
    return { ...input, id: crypto.randomUUID(), occurredAt: new Date().toISOString() };
  }

  snapshot(userId: string, period: string, events: GrowthEvent[]): GrowthSnapshot {
    if (!userId || !period) throw new Error("Growth snapshot requires user and period.");
    return { userId, period, events: events.filter((event) => event.userId === userId) };
  }
}