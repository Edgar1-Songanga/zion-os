export type SpiritualIntent = "prayer" | "bible" | "adventist_canon" | "sabbath_school" | "devotion" | "discipleship" | "ministry" | "testimony" | "general_spiritual";

export interface SpiritualIntelligenceContext {
  locale?: string;
  currentPathwayId?: string;
  completedStepIds?: string[];
  sabbathSchoolLessonId?: string;
  recentTopics?: string[];
  organizationId?: string;
}

export interface SpiritualIntelligenceResult {
  intent: SpiritualIntent;
  confidence: number;
  signals: string[];
  recommendations: Array<{ id: string; title: string; type: SpiritualIntent; reason: string }>;
}

const rules: Array<{ intent: SpiritualIntent; words: string[] }> = [
  { intent: "prayer", words: ["oração", "orar", "ore", "interceder"] },
  { intent: "bible", words: ["bíblia", "versículo", "passagem", "escritura"] },
  { intent: "adventist_canon", words: ["doutrina", "crença fundamental", "manual da igreja", "declaração oficial"] },
  { intent: "sabbath_school", words: ["escola sabatina", "lição semanal", "lição"] },
  { intent: "devotion", words: ["devocional", "reflexão", "meditação bíblica"] },
  { intent: "discipleship", words: ["discipulado", "crescer na fé", "próximo passo", "plano espiritual"] },
  { intent: "ministry", words: ["ministério", "igreja", "departamento", "pastor", "evangelismo"] },
  { intent: "testimony", words: ["testemunho", "testemunhar"] },
];

export function classifySpiritualIntent(message: string): Omit<SpiritualIntelligenceResult, "recommendations"> {
  const value = message.toLocaleLowerCase().trim();
  if (!value) throw new Error("A user message is required.");
  let intent: SpiritualIntent = "general_spiritual";
  let signals: string[] = [];
  for (const rule of rules) {
    const matches = rule.words.filter((word) => value.includes(word));
    if (matches.length > signals.length) { intent = rule.intent; signals = matches; }
  }
  return { intent, confidence: intent === "general_spiritual" ? 0.35 : Math.min(0.95, 0.55 + signals.length * 0.15), signals };
}

export function recommendSpiritualNextSteps(intent: SpiritualIntent, context: SpiritualIntelligenceContext = {}) {
  const items: SpiritualIntelligenceResult["recommendations"] = [];
  const add = (id: string, title: string, type: SpiritualIntent, reason: string) => {
    if (!(context.completedStepIds ?? []).includes(id)) items.push({ id, title, type, reason });
  };
  if (intent === "prayer") add("prayer-reflection", "Registar um pedido de oração", "prayer", "Transformar a conversa em prática acompanhável.");
  if (intent === "bible" || intent === "adventist_canon") add("scripture-study", "Continuar o estudo bíblico", "bible", "Relacionar a pergunta com as Escrituras e fontes confiáveis.");
  if (intent === "sabbath_school" || context.sabbathSchoolLessonId) add("sabbath-school-follow-up", "Continuar a Lição da Escola Sabatina", "sabbath_school", "Manter continuidade entre conversa, estudo e progresso.");
  if (intent === "devotion") add("daily-devotion", "Registar a reflexão devocional", "devotion", "Converter reflexão em histórico de crescimento.");
  if (intent === "discipleship" || context.currentPathwayId) add("next-discipleship-step", "Avançar para o próximo passo", "discipleship", "O discipulado deve orientar progressivamente.");
  if (intent === "ministry") add("ministry-action", "Explorar uma ação de ministério", "ministry", "Ligar conhecimento espiritual a serviço.");
  return items.slice(0, 4);
}
