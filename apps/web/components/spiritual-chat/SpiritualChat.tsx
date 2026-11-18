"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { resaRequest } from "@/lib/resa/api";
import { OrganizationSelector, type ZionOrganization } from "@/components/organization/OrganizationSelector";

type Conversation = { id: string; title: string; created_at: string; updated_at: string };
type StoredMessage = { id: string; role: "user" | "assistant"; content: string; payload?: Record<string, unknown>; created_at: string };
type AiResult = { content: string; references: string[]; provider: string };

const SUGGESTIONS = [
  "Ajuda-me a estudar o contexto histórico e bíblico do sábado.",
  "Explica uma das 28 crenças fundamentais com referências.",
  "Prepara um plano de estudo bíblico de sete dias sobre esperança.",
  "Ajuda-me a estruturar uma reflexão para a Escola Sabatina.",
];

export default function SpiritualChat() {
  const [organizationId, setOrganizationId] = useState("");
  const [organization, setOrganization] = useState<ZionOrganization | null>(null);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<AiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [persistenceStatus, setPersistenceStatus] = useState<"loading" | "saved" | "local">("loading");

  async function openConversation(conversation: Conversation) {
    setHistoryLoading(true);
    setConversationId(conversation.id);
    setResult(null);
    setError("");
    try {
      const data = await resaRequest<{ items: StoredMessage[] }>(
        "/v1/spiritual/chat/conversations/" + encodeURIComponent(conversation.id) + "/messages",
      );
      setMessages(data.items ?? []);
      const lastAssistant = [...(data.items ?? [])].reverse().find((item) => item.role === "assistant");
      const references = Array.isArray(lastAssistant?.payload?.references)
        ? (lastAssistant?.payload?.references as unknown[]).filter((item): item is string => typeof item === "string")
        : [];
      if (lastAssistant) setResult({ content: lastAssistant.content, references, provider: String(lastAssistant.payload?.provider ?? "AI Core") });
      setPersistenceStatus("saved");
    } catch {
      setPersistenceStatus("local");
      setError("Não foi possível carregar esta conversa. Tenta novamente.");
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void resaRequest<{ items: Conversation[] }>("/v1/spiritual/chat/conversations")
      .then(async (data) => {
        if (!active) return;
        setConversations(data.items ?? []);
        if (data.items?.[0]) await openConversation(data.items[0]);
        else setPersistenceStatus("saved");
      })
      .catch(() => { if (active) setPersistenceStatus("local"); })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, []);

  function chooseOrganization(id: string, selected: ZionOrganization) {
    setOrganizationId(id);
    setOrganization(selected);
    setResult(null);
    setError("");
  }

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const prompt = message.trim();
    if (!prompt || loading || !organizationId) return;
    setLoading(true);
    setError("");
    setMessage("");
    setResult(null);
    const userMessage: StoredMessage = {
      id: "pending-user-" + Date.now(), role: "user", content: prompt, created_at: new Date().toISOString(),
    };
    setMessages((current) => [...current, userMessage]);

    try {
      const ai = await resaRequest<AiResult>("/v1/ai/chat", {
        method: "POST",
        body: JSON.stringify({ organizationId, prompt }),
      });
      if (!ai?.content?.trim()) throw new Error("O serviço de IA não devolveu uma resposta utilizável.");
      const safeResult = {
        content: ai.content,
        references: Array.isArray(ai.references) ? ai.references.filter((item) => typeof item === "string") : [],
        provider: ai.provider || "AI Core",
      };
      setResult(safeResult);
      const assistantMessage: StoredMessage = {
        id: "pending-assistant-" + Date.now(),
        role: "assistant",
        content: safeResult.content,
        payload: { references: safeResult.references, provider: safeResult.provider },
        created_at: new Date().toISOString(),
      };
      setMessages((current) => [...current, assistantMessage]);

      try {
        let activeConversationId = conversationId;
        if (!activeConversationId) {
          const created = await resaRequest<Conversation>("/v1/spiritual/chat/conversations", {
            method: "POST",
            body: JSON.stringify({ title: prompt.slice(0, 120) }),
          });
          activeConversationId = created.id;
          setConversationId(created.id);
        }
        await resaRequest("/v1/spiritual/chat/conversations/" + encodeURIComponent(activeConversationId) + "/messages", {
          method: "POST",
          body: JSON.stringify({
            question: prompt,
            answer: safeResult.content,
            payload: { references: safeResult.references, provider: safeResult.provider },
          }),
        });
        setPersistenceStatus("saved");
        const refreshed = await resaRequest<{ items: Conversation[] }>("/v1/spiritual/chat/conversations");
        setConversations(refreshed.items ?? []);
      } catch {
        setPersistenceStatus("local");
        setError("A resposta foi gerada, mas não foi possível sincronizar o histórico. O conteúdo continua visível nesta sessão.");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível obter uma resposta da IA. Tenta novamente.");
      setPersistenceStatus("local");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_24px_80px_-36px_rgba(15,35,65,0.35)]">
      <div className="relative overflow-hidden bg-[#09182D] px-6 py-8 text-white sm:px-9">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">ZION intelligence</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Assistente bíblico e espiritual</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Estudo contextual, referências e apoio à preparação espiritual, com respostas geradas pelo AI Core e contexto institucional autorizado.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-xs font-medium text-emerald-100">
            <span className="h-2 w-2 rounded-full bg-emerald-300" /> IA integrada
          </span>
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <OrganizationSelector value={organizationId} onChange={chooseOrganization} />
            <p className="mt-2 text-xs leading-5 text-slate-500">A organização selecionada define o contexto de acesso. O servidor confirma a tua pertença activa antes de encaminhar qualquer pergunta.</p>
            {organization && <p className="mt-1 text-xs font-medium text-slate-600">Contexto activo: {organization.name}</p>}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">Conversa</p>
            <span role="status" className="text-xs text-slate-500">
              {historyLoading || persistenceStatus === "loading" ? "A carregar histórico…" : persistenceStatus === "saved" ? "Histórico sincronizado" : "Histórico não sincronizado"}
            </span>
          </div>

          {conversations.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {conversations.map((item) => (
                <button key={item.id} type="button" onClick={() => void openConversation(item)}
                  aria-pressed={conversationId === item.id}
                  className={"shrink-0 rounded-xl border px-3 py-2 text-xs transition " + (conversationId === item.id ? "border-[#C8A24A] bg-amber-50 text-slate-900" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400")}>
                  {item.title}
                </button>
              ))}
              <button type="button" onClick={() => { setConversationId(null); setMessages([]); setResult(null); setError(""); setPersistenceStatus("saved"); }}
                className="shrink-0 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">Nova conversa</button>
            </div>
          )}

          <div className="mt-4 min-h-48 space-y-3" aria-label="Histórico da conversa">
            {messages.map((item) => (
              <div key={item.id} className={"rounded-2xl px-4 py-3 text-sm leading-6 " + (item.role === "user" ? "ml-8 bg-[#102B49] text-white" : "mr-3 border border-slate-200 bg-white text-slate-700")}>
                <p className={"mb-1 text-[10px] font-semibold uppercase tracking-wider " + (item.role === "user" ? "text-slate-300" : "text-slate-400")}>{item.role === "user" ? "A tua pergunta" : "ZION AI"}</p>
                <p className="whitespace-pre-line">{item.content}</p>
              </div>
            ))}
            {loading && <div role="status" className="mr-8 rounded-2xl border border-cyan-100 bg-cyan-50/70 px-4 py-3 text-sm text-slate-600">A analisar a pergunta e a preparar uma resposta fundamentada…</div>}
            {!messages.length && !loading && <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-8 text-center"><p className="text-sm font-medium text-slate-700">Começa por escolher uma organização e colocar uma questão.</p><p className="mt-1 text-xs text-slate-500">Podes usar uma das sugestões ou escrever livremente.</p></div>}
          </div>

          {result && (
            <div aria-live="polite" className="mt-5 rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50/70 to-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900">Resposta do assistente</h3>
                <span className="rounded-full border border-cyan-200 bg-white px-2.5 py-1 text-[10px] font-medium text-cyan-800">{result.provider}</span>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{result.content}</p>
              {result.references.length > 0 && <div className="mt-4 border-t border-cyan-100 pt-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Referências fornecidas</p><ul className="mt-2 space-y-1">{result.references.map((reference) => <li key={reference} className="text-sm text-slate-700">{reference}</li>)}</ul></div>}
            </div>
          )}

          {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}

          <form onSubmit={send} className="mt-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <label htmlFor="zion-ai-prompt" className="sr-only">A tua pergunta</label>
            <textarea id="zion-ai-prompt" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={12000} rows={3}
              placeholder="Escreve a tua pergunta, descreve o estudo ou explica o que precisas de preparar…"
              className="w-full resize-y border-0 bg-transparent p-2 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 focus:ring-0" />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <span className="text-[11px] text-slate-400">{message.length}/12000 caracteres</span>
              <button type="submit" disabled={!message.trim() || !organizationId || loading}
                className="rounded-xl bg-[#0B2D4D] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#16466F] disabled:cursor-not-allowed disabled:opacity-40">
                {loading ? "A analisar…" : "Enviar pergunta"}
              </button>
            </div>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Explorar capacidades</p>
            <div className="mt-3 space-y-2">
              {SUGGESTIONS.map((suggestion) => <button key={suggestion} type="button" onClick={() => setMessage(suggestion)}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left text-xs leading-5 text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50/40">{suggestion}</button>)}
            </div>
          </div>
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-900">Transparência</p>
            <p className="mt-2 text-xs leading-5 text-amber-950/80">A IA deve distinguir referências bíblicas, fontes oficiais, interpretação e opinião. Confirma sempre as fontes antes de usar uma resposta como posição institucional.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
