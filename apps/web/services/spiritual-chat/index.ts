import { searchKnowledge } from "@/data/knowledge";

export type SpiritualIntent = "prayer" | "bible" | "adventist_canon" | "sabbath_school" | "devotion" | "discipleship" | "general_spiritual";

function classify(question: string): SpiritualIntent {
  const value = question.toLocaleLowerCase();
  if (value.includes("oração") || value.includes("orar")) return "prayer";
  if (value.includes("escola sabatina") || value.includes("lição")) return "sabbath_school";
  if (value.includes("doutrina") || value.includes("crença fundamental") || value.includes("manual da igreja")) return "adventist_canon";
  if (value.includes("devocional") || value.includes("reflexão")) return "devotion";
  if (value.includes("discipulado") || value.includes("crescer na fé")) return "discipleship";
  if (value.includes("bíblia") || value.includes("versículo") || value.includes("passagem")) return "bible";
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
          ? ["Continuar o estudo", "Consultar a fonte de referência"]
          : ["Explorar um estudo relacionado"];

  if (result) return { title: result.title, answer: result.content, references: result.references, type: result.type, intent, nextSteps };
  return {
    title: "Pesquisa espiritual",
    answer: "Não encontrei uma resposta específica na base disponível. Posso orientar a pesquisa por Bíblia, fontes Adventistas autorizadas, Escola Sabatina, oração ou discipulado.",
    references: [],
    type: "",
    intent,
    nextSteps,
  };
}
