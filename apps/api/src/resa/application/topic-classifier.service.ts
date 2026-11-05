import { Injectable } from '@nestjs/common';

export interface ResaTopicInput {
  readonly type: string;
  readonly title?: string | null;
  readonly body?: string | null;
  readonly scriptureReferences?: readonly string[];
}

interface TopicRule {
  readonly name: string;
  readonly normalizedName: string;
  readonly terms: readonly string[];
}

const RULES: readonly TopicRule[] = [
  { name: 'Oração', normalizedName: 'oracao', terms: ['oração', 'oracao', 'oração por', 'pray', 'prayer', 'intercessão', 'intercessao'] },
  { name: 'Estudo Bíblico', normalizedName: 'estudo-biblico', terms: ['bíblia', 'biblia', 'estudo bíblico', 'estudo biblico', 'bible study', 'scripture', 'versículo', 'versiculo'] },
  { name: 'Testemunho', normalizedName: 'testemunho', terms: ['testemunho', 'testimony', 'milagre', 'miracle', 'superação', 'superacao'] },
  { name: 'Sermão', normalizedName: 'sermao', terms: ['sermão', 'sermao', 'pregação', 'pregacao', 'sermon', 'homilia'] },
  { name: 'Família', normalizedName: 'familia', terms: ['família', 'familia', 'family', 'pais', 'filhos', 'children'] },
  { name: 'Juventude', normalizedName: 'juventude', terms: ['jovem', 'juventude', 'youth', 'adolescente', 'adolescent'] },
  { name: 'Casamento', normalizedName: 'casamento', terms: ['casamento', 'matrimónio', 'matrimonio', 'marriage', 'cônjuge', 'conjuge'] },
  { name: 'Saúde', normalizedName: 'saude', terms: ['saúde', 'saude', 'health', 'bem-estar', 'bem estar', 'alimentação', 'alimentacao'] },
  { name: 'Evangelismo', normalizedName: 'evangelismo', terms: ['evangelismo', 'evangelização', 'evangelizacao', 'missionário', 'missionario', 'mission'] },
  { name: 'Serviço Comunitário', normalizedName: 'servico-comunitario', terms: ['serviço comunitário', 'servico comunitario', 'solidariedade', 'voluntariado', 'community service', 'volunteer'] },
  { name: 'Liderança', normalizedName: 'lideranca', terms: ['liderança', 'lideranca', 'leadership', 'gestão', 'gestao', 'lider'] },
  { name: 'Devoção', normalizedName: 'devocao', terms: ['devocional', 'devoção', 'devocao', 'devotional', 'meditação', 'meditacao'] },
  { name: 'Louvor e Adoração', normalizedName: 'louvor-adoracao', terms: ['louvor', 'adoração', 'adoracao', 'worship', 'hino', 'hymn'] },
];

const TYPE_TOPICS: Readonly<Record<string, readonly string[]>> = {
  prayer: ['oracao'],
  bible_study: ['estudo-biblico'],
  testimony: ['testemunho'],
  sermon: ['sermao'],
  devotional: ['devocao'],
};

@Injectable()
export class ResaTopicClassifierService {
  classify(input: ResaTopicInput): readonly TopicRule[] {
    const text = [
      input.type,
      input.title ?? '',
      input.body ?? '',
      ...(input.scriptureReferences ?? []),
    ].join(' ').toLocaleLowerCase();

    const selected = new Set(TYPE_TOPICS[input.type.toLowerCase()] ?? []);
    for (const rule of RULES) {
      if (rule.terms.some((term) => text.includes(term))) selected.add(rule.normalizedName);
    }

    return RULES.filter((rule) => selected.has(rule.normalizedName)).slice(0, 5);
  }
}
