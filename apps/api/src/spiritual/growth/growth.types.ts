export type GrowthArea = "bible" | "prayer" | "devotion" | "service" | "community" | "leadership";

export interface GrowthEvent {
  id: string;
  userId: string;
  area: GrowthArea;
  source: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface GrowthRepository {
  record(token: string, event: GrowthEvent): Promise<GrowthEvent>;
  listForUser(token: string, userId: string, from?: string, to?: string): Promise<GrowthEvent[]>;
}

export interface GrowthSnapshot {
  userId: string;
  period: string;
  events: GrowthEvent[];
}
