export type GamificationAction =
  | "devotion_completed"
  | "prayer_completed"
  | "bible_read"
  | "study_completed"
  | "service_completed"
  | "community_contribution"
  | "leadership_activity";

export interface PointRule {
  action: GamificationAction;
  points: number;
  dailyLimit?: number;
}

export interface AwardEvent {
  id: string;
  userId: string;
  action: GamificationAction;
  points: number;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface UserProgress {
  userId: string;
  points: number;
  level: number;
  events: AwardEvent[];
}
