import { Injectable } from '@nestjs/common';

export interface RecommendationContext {
  followedAuthor: boolean;
  interactionCount: number;
  saved: boolean;
  feedback?: 'not_interested' | 'hide_author' | 'report';
  contentType: string;
  ageHours: number;
  viewDurationMs?: number;
  viewCount?: number;
  completedViews?: number;
}

@Injectable()
export class ResaRecommendationService {
  score(context: RecommendationContext): number {
    if (context.feedback === 'report' || context.feedback === 'hide_author') {
      return Number.NEGATIVE_INFINITY;
    }

    const relationship = context.followedAuthor ? 22 : 0;
    const popularity = Math.min(Math.max(context.interactionCount, 0), 30) * 0.3;
    const save = context.saved ? 18 : 0;
    const dwell = Math.min(Math.max(context.viewDurationMs ?? 0, 0) / 1000, 90) * 0.16;
    const completion = Math.min(Math.max(context.completedViews ?? 0, 0), 5) * 2;
    const repeatPenalty = Math.min(Math.max((context.viewCount ?? 0) - 2, 0) * 6, 24);
    const spiritualRelevance = [
      'prayer',
      'bible_study',
      'sermon',
      'testimony',
      'scripture',
      'devotional',
    ].includes(context.contentType.toLowerCase()) ? 8 : 0;
    const freshness = Math.max(0, 24 - Math.max(0, context.ageHours)) * 0.55;
    const discovery = context.followedAuthor ? 0 : 5;
    const explicitDisinterest = context.feedback === 'not_interested' ? 100 : 0;

    return relationship + popularity + save + dwell + completion
      + spiritualRelevance + freshness + discovery
      - repeatPenalty - explicitDisinterest;
  }

  rank<T extends { id: string }>(
    items: Array<T & RecommendationContext>,
  ): Array<T & RecommendationContext & { score: number }> {
    return items
      .map((item) => ({ ...item, score: this.score(item) }))
      .filter((item) => Number.isFinite(item.score))
      .sort((a, b) => b.score - a.score);
  }
}
