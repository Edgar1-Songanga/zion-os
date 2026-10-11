import { searchKnowledge } from "@/data/knowledge";

export type SpiritualIntent = "prayer" | "bible" | "adventist_canon" | "sabbath_school" | "devotion" | "discipleship" | "general_spiritual";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

function classify(question: string): SpiritualIntent {
  const value = normalize(question);
  if (/\boracao\b|\borar\b|\bore\b/.test(value)) return "prayer";
  if (value.includes("escola sabatina") || value.includes("licao")) return "sabbath_school";
  if (value.includes("doutrina") || value.includes("crenca fundamental") || value.includes("manual da igreja")) return "adventist_canon";
  if (value.includes("devocional") || value.includes("reflexao")) return "devotion";
  if (value.includes("discipulado") || value.includes("crescer na fe")) return "discipleship";
  if (value.includes("biblia") || value.includes("versiculo") || value.includes("passagem") || value.includes("sabado") || value.includes("escritura")) return "bible";
  return "general_spiritual";
}

export function spiritualSearch(question: string) {
  const normalized = question.trim();
  if (!normalized) return { title: "Comece uma conversa", answer: "Escreva uma pergunta para começarmos.", references: [], type: "", intent: "general_spiritual" as SpiritualIntent, nextSteps: [] };

  const result = searchKnowledge(normalized);
  const intent = classify(normalized);
  const nextSteps = intent === "prayer"
    ? ["Registar um pedido de oração", "Voltar à oração depois da conversa"]
    : intent === "sabbath_school"
      ? ["Continuar a lição", "Registar a reflexão"]
      : intent === "discipleship"
        ? ["Ver o próximo passo do discipulado", "Acompanhar o progresso"]
        : intent === "bible" || intent === "adventist_canon"
          ? ["Continuar o estudo", "Ler as passagens bíblicas no seu contexto"]
          : ["Explorar um estudo relacionado"];

  if (result) return { title: result.title, answer: result.content, references: result.references, type: result.type, intent, nextSteps };
  return {
    title: "Pesquisa espiritual",
    answer: "Ainda não encontrei uma resposta suficientemente fundamentada na base bíblica disponível. Experimenta indicar um tema ou uma passagem (por exemplo, «sábado», «oração» ou «Salmo 23»). Esta versão usa pesquisa bíblica local; não está a gerar respostas por IA.",
    references: [],
    type: "",
    intent,
    nextSteps,
  };
}
