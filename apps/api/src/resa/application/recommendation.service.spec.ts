import { ResaRecommendationService } from './recommendation.service';

describe('ResaRecommendationService', () => {
  const service = new ResaRecommendationService();
  const base = {
    followedAuthor: false,
    interactionCount: 0,
    saved: false,
    contentType: 'text',
    ageHours: 2,
  };

  it('increases relevance for interests learned from other content', () => {
    expect(service.score({ ...base, topicInterestScore: 40 }))
      .toBeGreaterThan(service.score({ ...base, topicInterestScore: 0 }));
  });

  it('uses completed views and dwell time as stronger intent signals', () => {
    expect(service.score({ ...base, viewDurationMs: 45000, completedViews: 2 }))
      .toBeGreaterThan(service.score({ ...base, viewDurationMs: 1000, completedViews: 0 }));
  });

  it('reduces repetitive exposure and explicit disinterest', () => {
    expect(service.score({ ...base, viewCount: 8 }))
      .toBeLessThan(service.score({ ...base, viewCount: 1 }));
    expect(service.score({ ...base, feedback: 'not_interested' }))
      .toBeLessThan(service.score(base));
  });

  it('excludes reported content and hidden authors', () => {
    expect(service.score({ ...base, feedback: 'report' })).toBe(Number.NEGATIVE_INFINITY);
    expect(service.score({ ...base, feedback: 'hide_author' })).toBe(Number.NEGATIVE_INFINITY);
  });

  it('preserves discovery and spiritual-content signals', () => {
    expect(service.score({ ...base, contentType: 'bible_study' }))
      .toBeGreaterThan(service.score(base));
    expect(service.score({ ...base, followedAuthor: true }))
      .toBeGreaterThan(service.score(base));
  });
});
