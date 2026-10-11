export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  references: string[];
  type: string;
  keywords?: string[];
}

const knowledgeBase: KnowledgeItem[] = [
  {
    id: "bible-sabbath",
    title: "O sábado na Bíblia",
    content:
      "Na leitura Adventista do Sétimo Dia, o sábado é o sétimo dia da semana, separado por Deus na criação como dia de descanso e bênção (Génesis 2:2-3). O quarto mandamento convida a lembrar e guardar o sábado (Êxodo 20:8-11). Jesus afirmou que o sábado foi feito para benefício da humanidade e declarou ser Senhor do sábado (Marcos 2:27-28); Lucas 4:16 também regista o seu costume de participar no culto ao sábado. Os cristãos têm diferentes interpretações sobre a observância do sábado; esta resposta descreve a compreensão Adventista e recomenda a leitura do contexto completo de cada passagem.",
    references: ["Génesis 2:2-3", "Êxodo 20:8-11", "Marcos 2:27-28", "Lucas 4:16"],
    type: "doctrine",
    keywords: ["sábado", "sabado", "sétimo dia", "setimo dia", "descanso", "quarto mandamento", "dia santo", "dia de repouso", "guardar o sábado", "lei de deus", "sabath", "sabbath"],
  },
  {
    id: "bible-prayer",
    title: "Oração",
    content:
      "A oração é uma comunicação pessoal com Deus, que pode incluir louvor, gratidão, confissão, pedidos e intercessão. Jesus ensinou os seus discípulos a orar e apresentou um modelo de oração em Mateus 6:9-13.",
    references: ["Mateus 6:9-13", "Filipenses 4:6-7"],
    type: "spiritual",
    keywords: ["oração", "orar", "ore", "falar com deus", "intercessão", "interceder", "pedido de oração"],
  },
  {
    id: "bible-hope",
    title: "Esperança e confiança em Deus",
    content:
      "A Bíblia convida as pessoas a confiar em Deus mesmo em períodos de incerteza. Salmo 46 apresenta Deus como refúgio e fortaleza, e Romanos 15:13 expressa uma oração para que Deus encha o coração de esperança.",
    references: ["Salmo 46:1", "Romanos 15:13"],
    type: "spiritual",
    keywords: ["esperança", "medo", "ansiedade", "confiança", "consolo", "dificuldade", "fé"],
  },
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const stopWords = new Set([
  "a", "o", "as", "os", "de", "da", "do", "das", "dos", "na", "no", "nas", "nos",
  "e", "ou", "que", "sobre", "para", "por", "com", "um", "uma", "eu", "gostava",
  "gostaria", "quero", "pode", "podes", "dizer", "saber", "diz", "fala", "biblia",
  "segundo", "existe", "qual", "quais", "como", "porque", "me", "nao", "ser",
]);

export function searchKnowledge(query: string): KnowledgeItem | undefined {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return undefined;
  const queryTokens = normalizedQuery.split(" ").filter((token) => token.length > 1 && !stopWords.has(token));
  if (!queryTokens.length) return undefined;

  const ranked = knowledgeBase.map((item) => {
    const title = normalize(item.title);
    const content = normalize(item.content);
    const keywords = (item.keywords ?? []).map(normalize);
    let score = 0;
    for (const token of queryTokens) {
      if (title.split(" ").includes(token)) score += 5;
      if (keywords.some((keyword) => keyword === token || keyword.split(" ").includes(token))) score += 4;
      if (content.split(" ").includes(token)) score += 1;
    }
    if (normalizedQuery.includes("sabado") && item.id === "bible-sabbath") score += 8;
    if (normalizedQuery.includes("setimo dia") && item.id === "bible-sabbath") score += 8;
    return { item, score };
  }).sort((a, b) => b.score - a.score);

  return ranked[0]?.score > 0 ? ranked[0].item : undefined;
}
