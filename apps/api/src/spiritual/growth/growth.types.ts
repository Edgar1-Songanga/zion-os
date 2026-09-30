export type GrowthArea = "bible" | "prayer" | "devotion" | "service" | "community" | "leadership";

export interface GrowthEvent {
  id: string;
  userId: string;
  area: GrowthArea;
  source: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface GrowthSnapshot {
  userId: string;
  period: string;
  events: GrowthEvent[];
}