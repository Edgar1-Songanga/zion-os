"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { spiritualSearch } from "@/services/spiritual-chat";
import { resaRequest } from "@/lib/resa/api";

type SpiritualResponse = ReturnType<typeof spiritualSearch>;
type BiblePassage = { reference: { book: string; chapter: number; verseStart?: number; verseEnd?: number }; text: string; verses?: string[]; translation: string; copyright?: string };
type Conversation = { id: string; title: string; created_at: string; updated_at: string };
type StoredMessage = { id: string; role: "user" | "assistant"; content: string; payload?: Record<string, unknown>; created_at: string };

export default function SpiritualChat() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<SpiritualResponse | null>(null);
  const [passages, setPassages] = useState<BiblePassage[]>([]);
  const [loading, setLoading] = useState(false);
  const [passageNotice, setPassageNotice] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [persistenceStatus, setPersistenceStatus] = useState<"loading" | "saved" | "local">("loading");

  async function openConversation(conversation: Conversation) {
    setHistoryLoading(true);
    setConversationId(conversation.id);
    setResponse(null);
    setPassages([]);
    try {
      const result = await resaRequest<{ items: StoredMessage[] }>(
        "/v1/spiritual/chat/conversations/" + encodeURIComponent(conversation.id) + "/messages",
      );
      setMessages(result.items ?? []);
      const lastAssistant = [...(result.items ?? [])].reverse().find((item) => item.role === "assistant");
      const savedResponse = lastAssistant?.payload?.response as SpiritualResponse | undefined;
      if (savedResponse?.answer) setResponse(savedResponse);
      setPersistenceStatus("saved");
    } catch {
      setPersistenceStatus("local");
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const result = await resaRequest<{ items: Conversation[] }>("/v1/spiritual/chat/conversations");
        if (!active) return;
        setConversations(result.items ?? []);
        if (result.items?.[0]) await openConversation(result.items[0]);
        else setPersistenceStatus("saved");
      } catch {
        if (active) setPersistenceStatus("local");
      } finally {
        if (active) setHistoryLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const question = message.trim();
    if (!question || loading) return;
    const answer = spiritualSearch(question);
    setResponse(answer);
    setPassages([]);
    setPassageNotice(null);
    setMessages((current) => [...current, {
      id: "local-user-" + Date.now(), role: "user", content: question, created_at: new Date().toISOString(),
    }, {
      id: "local-assistant-" + Date.now(), role: "assistant", content: answer.answer,
      payload: { response: answer }, created_at: new Date().toISOString(),
    }]);
    setMessage("");

    try {
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        const created = await resaRequest<Conversation>("/v1/spiritual/chat/conversations", {
          method: "POST",
          body: JSON.stringify({ title: question.slice(0, 120) }),
        });
        activeConversationId = created.id;
        setConversationId(created.id);
        setConversations((current) => [created, ...current]);
      }
      await resaRequest("/v1/spiritual/chat/conversations/" + encodeURIComponent(activeConversationId) + "/messages", {
        method: "POST",
        body: JSON.stringify({ question, answer: answer.answer, payload: { response: answer } }),
      });
      setPersistenceStatus("saved");
      const refreshed = await resaRequest<{ items: Conversation[] }>("/v1/spiritual/chat/conversations");
      setConversations(refreshed.items ?? []);
    } catch {
      setPersistenceStatus("local");
    }

    if (!answer.references.length) return;
    setLoading(true);
    try {
      const results = await Promise.allSettled(
        answer.references.slice(0, 4).map(async (reference) => {
          const found = await resaRequest<BiblePassage[]>(
            `/v1/spiritual/bible/search?q=${encodeURIComponent(reference)}&translation=almeida-livre`,
          );
          return found[0];
        }),
      );
      const available = results.flatMap((result) => {
        if (result.status !== "fulfilled") return [];
        const passage = result.value;
        return passage && (passage.text || passage.verses?.length) ? [passage] : [];
      });
      setPassages(available);
      if (!available.length) setPassageNotice("A resposta inclui referências bíblicas, mas não foi possível carregar o texto dos versículos neste momento.");
    } catch {
      setPassageNotice("A resposta inclui referências bíblicas. O texto integral das passagens não ficou disponível nesta consulta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="max-w-3xl rounded-3xl border border-[var(--zion-border)] bg-white p-6 shadow-[var(--zion-shadow-sm)] sm:p-8">
      <div className="h-1 w-12 rounded-full bg-[var(--zion-gold)]" />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--zion-primary)]">Assistente bíblico e espiritual</h2>
        <span role="status" className="text-xs text-[var(--zion-muted)]">
          {persistenceStatus === "loading" || historyLoading ? "A carregar histórico…" : persistenceStatus === "saved" ? "Histórico sincronizado na tua conta" : "Não sincronizado — disponível apenas nesta sessão"}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--zion-muted)]">
        Faz uma pergunta sobre as Escrituras, oração ou vida espiritual. As respostas disponíveis incluem referências para continuares o estudo.
      </p>

      {conversations.length > 0 && (
        <div className="mt-5 rounded-xl border border-[var(--zion-border)] p-3">
          <p className="mb-2 text-xs font-semibold text-[var(--zion-muted)]">Conversas anteriores</p>
          <div className="flex flex-wrap gap-2">
            {conversations.map((item) => (
              <button key={item.id} type="button" onClick={() => void openConversation(item)}
                aria-pressed={conversationId === item.id}
                className={"rounded-lg border px-3 py-2 text-xs " + (conversationId === item.id ? "border-[var(--zion-gold)] bg-amber-50" : "border-[var(--zion-border)]")}>
                {item.title}
              </button>
            ))}
            <button type="button" onClick={() => { setConversationId(null); setMessages([]); setResponse(null); setPassages([]); setPersistenceStatus("saved"); }}
              className="rounded-lg border border-dashed border-[var(--zion-border)] px-3 py-2 text-xs">Nova conversa</button>
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div className="mt-5 space-y-3" aria-label="Histórico da conversa">
          {messages.map((item) => (
            <div key={item.id} className={"rounded-xl p-4 text-sm leading-6 " + (item.role === "user" ? "ml-6 bg-slate-100 text-[var(--zion-dark)]" : "mr-6 border border-[var(--zion-border)] bg-white text-[var(--zion-dark)]")}>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--zion-muted)]">{item.role === "user" ? "A tua pergunta" : "ZION"}</p>
              <p className="whitespace-pre-line">{item.content}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={(event) => send(event)} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500}
          placeholder="Ex.: O que diz a Bíblia sobre o sábado?" aria-label="A tua pergunta espiritual"
          className="min-w-0 flex-1 rounded-xl border border-[var(--zion-border)] bg-[var(--zion-light)] p-4 text-[var(--zion-dark)] outline-none transition focus:border-[var(--zion-sky)] focus:bg-white focus:ring-4 focus:ring-[var(--zion-sky)]/10" />
        <button type="submit" disabled={!message.trim() || loading}
          className="rounded-xl bg-[var(--zion-primary)] px-6 py-4 font-semibold text-white shadow-sm transition hover:bg-[var(--zion-primary-deep)] disabled:cursor-not-allowed disabled:opacity-50">
          Pesquisar
        </button>
      </form>

      {response && (
        <div aria-live="polite" className="mt-8 rounded-2xl border border-[var(--zion-border)] bg-[var(--zion-light)] p-5 sm:p-6">
          <h3 className="text-xl font-bold text-[var(--zion-dark)]">{response.title}</h3>
          <span className="mt-2 inline-flex rounded-full border border-[var(--zion-border)] bg-white px-3 py-1 text-xs text-[var(--zion-muted)]">
            {response.intent === "bible" ? "Estudo bíblico" : response.intent === "prayer" ? "Oração" : response.intent === "sabbath_school" ? "Escola Sabatina" : "Estudo espiritual"}
          </span>
          <p className="mt-4 whitespace-pre-line leading-7 text-[var(--zion-dark)]">{response.answer}</p>

          {response.references.length > 0 && (
            <div className="mt-5 rounded-xl border border-[var(--zion-border)] bg-white p-4">
              <p className="mb-2 text-sm font-semibold text-[var(--zion-dark)]">Passagens para consultar</p>
              {response.references.map((reference) => <p key={reference} className="py-1 text-sm text-[var(--zion-muted)]">📖 {reference}</p>)}
            </div>
          )}
          {passages.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-semibold text-[var(--zion-dark)]">Texto bíblico consultado · {passages[0].translation}</p>
              {passages.map((passage, index) => (
                <article key={passage.reference.book + passage.reference.chapter + "-" + index} className="rounded-xl border border-[var(--zion-border)] bg-white p-4">
                  <h4 className="mb-2 font-semibold text-[var(--zion-primary)]">{passage.reference.book} {passage.reference.chapter}{passage.reference.verseStart ? ":" + passage.reference.verseStart + (passage.reference.verseEnd && passage.reference.verseEnd !== passage.reference.verseStart ? "–" + passage.reference.verseEnd : "") : ""}</h4>
                  {passage.verses?.length ? passage.verses.map((verse, verseIndex) => <p key={verseIndex} className="mb-2 text-sm leading-6 text-[var(--zion-dark)]">{verse}</p>) : <p className="text-sm leading-6 text-[var(--zion-dark)]">{passage.text}</p>}
                  {passage.copyright && <p className="mt-2 text-xs text-[var(--zion-muted)]">{passage.copyright}</p>}
                </article>
              ))}
            </div>
          )}
          {passageNotice && <p role="status" className="mt-4 rounded-xl bg-white p-3 text-sm text-[var(--zion-muted)]">{passageNotice}</p>}
          {response.nextSteps.length > 0 && (
            <div className="mt-5">
              <p className="font-semibold text-[var(--zion-dark)]">Próximos passos</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--zion-muted)]">
                {response.nextSteps.map((step) => <li key={step}>{step}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
