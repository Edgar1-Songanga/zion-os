import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ResaTopicClassifierService } from './topic-classifier.service';

describe('ResaTopicClassifierService', () => {
  const classifier = new ResaTopicClassifierService();

  it('maps explicit RESA content types to stable interests', () => {
    assert.ok(classifier.classify({ type: 'prayer' }).some((topic) => topic.normalizedName === 'oracao'));
    assert.ok(classifier.classify({ type: 'bible_study' }).some((topic) => topic.normalizedName === 'estudo-biblico'));
  });

  it('detects multiple topics from Portuguese and English text', () => {
    const topics = classifier.classify({
      type: 'text',
      title: 'Oração pela família',
      body: 'Pray for our children and community service projects.',
    }).map((topic) => topic.normalizedName);

    assert.ok(topics.includes('oracao'));
    assert.ok(topics.includes('familia'));
    assert.ok(topics.includes('servico-comunitario'));
  });

  it('limits classification to five curated topics', () => {
    const topics = classifier.classify({
      type: 'text',
      body: 'oração bíblia testemunho sermão família juventude casamento saúde evangelismo liderança louvor',
    });
    assert.ok(topics.length <= 5);
  });
});
