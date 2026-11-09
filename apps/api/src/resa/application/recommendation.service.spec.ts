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

  it('increases ranking for learned content interests', () => {
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
});
