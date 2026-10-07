import type { AwardEvent, GamificationAction, PointRule, UserProgress } from "./types.js";

const DEFAULT_RULES: readonly PointRule[] = [
  { action: "devotion_completed", points: 10, dailyLimit: 3 },
  { action: "prayer_completed", points: 5, dailyLimit: 10 },
  { action: "bible_read", points: 8, dailyLimit: 5 },
  { action: "study_completed", points: 15, dailyLimit: 3 },
  { action: "service_completed", points: 20, dailyLimit: 3 },
  { action: "community_contribution", points: 5, dailyLimit: 10 },
  { action: "leadership_activity", points: 12, dailyLimit: 5 },
];

export class GamificationEngine {
  constructor(private readonly rules: readonly PointRule[] = DEFAULT_RULES) {}

  calculatePoints(action: GamificationAction, progress: UserProgress, at = new Date()): number {
    const rule = this.rules.find((item) => item.action === action);
    if (!rule) return 0;
    if (!rule.dailyLimit) return rule.points;

    const day = at.toISOString().slice(0, 10);
    const used = progress.events.filter(
      (event) => event.action === action && event.occurredAt.slice(0, 10) === day,
    ).length;
    return used >= rule.dailyLimit ? 0 : rule.points;
  }

  award(userId: string, action: GamificationAction, progress: UserProgress, metadata?: Record<string, unknown>): UserProgress {
    const points = this.calculatePoints(action, progress);
    if (points === 0) return progress;

    const event: AwardEvent = {
      id: crypto.randomUUID(),
      userId,
      action,
      points,
      occurredAt: new Date().toISOString(),
      metadata,
    };
    const total = progress.points + points;
    return { ...progress, points: total, level: this.levelFor(total), events: [...progress.events, event] };
  }

  levelFor(points: number): number {
    if (points < 100) return 1;
    return Math.floor(Math.sqrt(points / 100)) + 1;
  }
}
