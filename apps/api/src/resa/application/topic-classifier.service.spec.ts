import { ResaTopicClassifierService } from './topic-classifier.service';

describe('ResaTopicClassifierService', () => {
  const classifier = new ResaTopicClassifierService();

  it('maps explicit RESA content types to stable interests', () => {
    expect(classifier.classify({ type: 'prayer' }).map((topic) => topic.normalizedName))
      .toContain('oracao');
    expect(classifier.classify({ type: 'bible_study' }).map((topic) => topic.normalizedName))
      .toContain('estudo-biblico');
  });

  it('detects multiple topics from Portuguese and English text', () => {
    const topics = classifier.classify({
      type: 'text',
      title: 'Oração pela família',
      body: 'Pray for our children and community service projects.',
    }).map((topic) => topic.normalizedName);

    expect(topics).toEqual(expect.arrayContaining(['oracao', 'familia', 'servico-comunitario']));
  });

  it('limits classification to five curated topics', () => {
    const topics = classifier.classify({
      type: 'text',
      body: 'oração bíblia testemunho sermão família juventude casamento saúde evangelismo liderança louvor',
    });
    expect(topics.length).toBeLessThanOrEqual(5);
  });
});
