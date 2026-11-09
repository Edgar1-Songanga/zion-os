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
  topicInterestScore?: number;
}

type DiversifiableItem = {
  id: string;
  author_id?: string;
  recommendationTopicKeys?: string[];
};

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
    const dwell = Math.min(Math.max(context.viewDurationMs ?? 0, 0) / 1000, 90) * 0.16;
    const completion = Math.min(Math.max(context.completedViews ?? 0, 0), 5) * 2;
    const learnedInterest = Math.min(Math.max(context.topicInterestScore ?? 0, 0), 80) * 0.25;
    const repeatPenalty = Math.min(Math.max((context.viewCount ?? 0) - 2, 0) * 6, 24);
    const explicitDisinterest = context.feedback === 'not_interested' ? 100 : 0;
    return relationship + interaction + save + spiritualRelevance + freshness + diversity
      + dwell + completion + learnedInterest - repeatPenalty - explicitDisinterest;
  }

  rank<T extends DiversifiableItem & RecommendationContext>(
    items: Array<T>,
  ): Array<T & { score: number }> {
    const remaining = items
      .map((item) => ({ ...item, score: this.score(item) }))
      .filter((item) => Number.isFinite(item.score));
    const ranked: Array<T & { score: number }> = [];
    const recentAuthors: string[] = [];
    const recentTopics: string[][] = [];

    // Greedy re-ranking preserves relevance while preventing one creator or
    // topic from monopolizing consecutive positions in the visible feed page.
    while (remaining.length) {
      let bestIndex = 0;
      let bestAdjustedScore = Number.NEGATIVE_INFINITY;
      for (let index = 0; index < remaining.length; index += 1) {
        const candidate = remaining[index];
        const author = candidate.author_id;
        const authorPenalty = !author ? 0
          : recentAuthors[0] === author ? 18
            : recentAuthors.includes(author) ? 8 : 0;
        const candidateTopics = candidate.recommendationTopicKeys ?? [];
        const recentTopicSet = new Set(recentTopics.flat());
        const topicOverlap = candidateTopics.filter((topic) => recentTopicSet.has(topic)).length;
        const topicPenalty = Math.min(topicOverlap * 5, 12);
        const adjustedScore = candidate.score - authorPenalty - topicPenalty;
        if (adjustedScore > bestAdjustedScore) {
          bestAdjustedScore = adjustedScore;
          bestIndex = index;
        }
      }
      const [selected] = remaining.splice(bestIndex, 1);
      ranked.push(selected);
      if (selected.author_id) recentAuthors.unshift(selected.author_id);
      recentAuthors.splice(3);
      recentTopics.unshift(selected.recommendationTopicKeys ?? []);
      recentTopics.splice(2);
    }
    return ranked;
  }
}
