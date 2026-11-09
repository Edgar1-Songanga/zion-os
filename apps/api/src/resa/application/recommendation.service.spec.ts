import { ResaRecommendationService } from './recommendation.service';

describe('ResaRecommendationService feed memory signals', () => {
  const service = new ResaRecommendationService();
  const base = {
    followedAuthor: false,
    interactionCount: 0,
    saved: false,
    contentType: 'text',
    ageHours: 2,
  };

  it('increases ranking for learned type and topic interests', () => {
    expect(service.score({ ...base, topicInterestScore: 40 }))
      .toBeGreaterThan(service.score(base));
  });

  it('uses dwell time and completed views as positive intent signals', () => {
    expect(service.score({ ...base, viewDurationMs: 45000, completedViews: 2 }))
      .toBeGreaterThan(service.score(base));
  });

  it('reduces repeated exposure and explicit disinterest', () => {
    expect(service.score({ ...base, viewCount: 8 }))
      .toBeLessThan(service.score({ ...base, viewCount: 1 }));
    expect(service.score({ ...base, feedback: 'not_interested' }))
      .toBeLessThan(service.score(base));
  });

  it('continues excluding reported and hidden-author content', () => {
    expect(service.score({ ...base, feedback: 'report' })).toBe(Number.NEGATIVE_INFINITY);
    expect(service.score({ ...base, feedback: 'hide_author' })).toBe(Number.NEGATIVE_INFINITY);
  });

  it('interleaves creators when another post has comparable relevance', () => {
    const ranked = service.rank([
      { ...base, id: 'a1', author_id: 'author-a', interactionCount: 10 },
      { ...base, id: 'a2', author_id: 'author-a', interactionCount: 9 },
      { ...base, id: 'b1', author_id: 'author-b', interactionCount: 9 },
    ]);
    expect(ranked.map((item) => item.id)).toEqual(['a1', 'b1', 'a2']);
  });

  it('reduces consecutive repetition of the same topics without removing relevant posts', () => {
    const ranked = service.rank([
      { ...base, id: 't1', author_id: 'a', recommendationTopicKeys: ['topic:faith'], interactionCount: 10 },
      { ...base, id: 't2', author_id: 'b', recommendationTopicKeys: ['topic:faith'], interactionCount: 9 },
      { ...base, id: 't3', author_id: 'c', recommendationTopicKeys: ['topic:hope'], interactionCount: 9 },
    ]);
    expect(ranked.map((item) => item.id)).toEqual(['t1', 't3', 't2']);
    expect(ranked).toHaveLength(3);
  });
});
