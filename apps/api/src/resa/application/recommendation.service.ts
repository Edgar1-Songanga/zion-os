import { Injectable } from '@nestjs/common';

export interface RecommendationContext {
  followedAuthor: boolean;
  interactionCount: number;
  saved: boolean;
  feedback?: 'not_interested' | 'hide_author' | 'report';
  contentType: string;
  ageHours: number;
}

@Injectable()
export class ResaRecommendationService {
  score(context: RecommendationContext): number {
    if (context.feedback === 'report' || context.feedback === 'hide_author') return Number.NEGATIVE_INFINITY;
    const relationship = context.followedAuthor ? 40 : 0;
    const interaction = Math.min(Math.max(context.interactionCount, 0), 20) * 1.5;
    const save = context.saved ? 12 : 0;
    const spiritualRelevance = ['prayer', 'bible_study', 'sermon', 'testimony'].includes(context.contentType) ? 6 : 0;
    const freshness = Math.max(0, 24 - Math.max(0, context.ageHours)) * 0.8;
    const diversity = context.followedAuthor ? 0 : 4;
    return relationship + interaction + save + spiritualRelevance + freshness + diversity;
  }

  rank<T extends { id: string }>(items: Array<T & RecommendationContext>): Array<T & RecommendationContext & { score: number }> {
    return items
      .map((item) => ({ ...item, score: this.score(item) }))
      .filter((item) => Number.isFinite(item.score))
      .sort((a, b) => b.score - a.score);
  }
}
