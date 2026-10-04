"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import ResaIcon from "@/components/resa/core/ResaIcon";

type Conversation = {
  id: string;
  title?: string | null;
  kind: string;
  updated_at?: string;
};

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type SearchResult = {
  id: string;
  title?: string | null;
  body?: string | null;
  entity_type?: string | null;
};

function formatDate(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessagesPage() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<SearchResult[]>([]);
  const [newOpen, setNewOpen] = useState(false);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedConversation = useMemo(
    () => items.find((item) => item.id === selected) ?? null,
    [items, selected],
  );

  const loadConversations = useCallback(async () => {
    try {
      const next = await resaRequest<Conversation[]>("/v1/resa/conversations");
      setItems(next);
      setError(null);
      if (!selected && next[0]) setSelected(next[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar as conversas.");
    }
  }, [selected]);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const next = await resaRequest<Message[]>(
        "/v1/resa/conversations/" + conversationId + "/messages?limit=100",
      );
      setMessages(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar as mensagens.");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
    const timer = window.setInterval(() => void loadConversations(), 10000);
    return () => window.clearInterval(timer);
  }, [loadConversations]);

  useEffect(() => {
    if (!selected) {
      setMessages([]);
      return;
    }
    void loadMessages(selected);
    const timer = window.setInterval(() => void loadMessages(selected), 5000);
    return () => window.clearInterval(timer);
  }, [selected, loadMessages]);

  async function searchPeople() {
    const value = query.trim();
    if (value.length < 2) return;
    setLoadingPeople(true);
    setError(null);
    try {
      const result = await resaRequest<SearchResult[]>(
        "/v1/resa/search?q=" + encodeURIComponent(value) + "&type=profile&limit=12",
      );
      setPeople(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível pesquisar pessoas.");
    } finally {
      setLoadingPeople(false);
    }
  }

  async function startConversation(person: SearchResult) {
    setError(null);
    try {
      const conversation = await resaRequest<Conversation>("/v1/resa/conversations", {
        method: "POST",
        body: JSON.stringify({
          member_ids: [person.id],
          title: person.title || "Nova conversa",
        }),
      });
      setNewOpen(false);
      setQuery("");
      setPeople([]);
      await loadConversations();
      setSelected(conversation.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível iniciar a conversa.");
    }
  }

  async function send() {
    const value = body.trim();
    if (!selected || !value || sending) return;
    setSending(true);
    setError(null);
    try {
      const msg = await resaRequest<Message>(
        "/v1/resa/conversations/" + selected + "/messages",
        { method: "POST", body: JSON.stringify({ body: value }) },
      );
      setMessages((current) => [msg, ...current]);
      setBody("");
      void loadConversations();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] pb-10 pt-5">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
        <header className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">RESA · Comunicação</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#0C1A3D]">Mensagens</h1>
            <p className="mt-1 text-sm text-slate-500">Conecte-se diretamente com pessoas da rede global ZION.</p>
          </div>
          <button
            onClick={() => { setNewOpen(true); setError(null); }}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#0C1A3D] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#122858]"
          >
            <ResaIcon name="plus" size={17} />
            Nova conversa
          </button>
        </header>

        {error && (
          <div role="alert" className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-semibold">Fechar</button>
          </div>
        )}

        <section className="grid min-h-[650px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(12,26,61,0.08)] lg:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#0C1A3D]">Conversas</p>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{items.length}</span>
              </div>
            </div>
            <div className="max-h-[560px] overflow-y-auto p-2">
              {items.map((item) => {
                const active = item.id === selected;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelected(item.id)}
                    className={"mb-1 w-full rounded-2xl p-4 text-left transition " + (active ? "bg-[#0C1A3D] text-white shadow-sm" : "hover:bg-slate-50")}
                  >
                    <div className="flex items-center gap-3">
                      <div className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold " + (active ? "bg-white/15 text-white" : "bg-[#eef2f8] text-[#0C1A3D]")}>
                        {(item.title || "C").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{item.title || "Conversa direta"}</p>
                        <p className={"mt-1 text-xs " + (active ? "text-white/60" : "text-slate-400")}>
                          {item.kind === "group" ? "Grupo" : "Conversa privada"}{item.updated_at ? " · " + formatDate(item.updated_at) : ""}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {!items.length && (
                <div className="px-6 py-14 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><ResaIcon name="message" size={20} /></div>
                  <p className="mt-4 text-sm font-semibold text-[#0C1A3D]">Ainda não há conversas</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Comece uma conversa com alguém da comunidade global.</p>
                </div>
              )}
            </div>
          </aside>

          <section className="flex min-h-[650px] flex-col">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef2f8] text-[#0C1A3D]"><ResaIcon name="message" size={18} /></div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#0C1A3D]">{selectedConversation?.title || "Selecione uma conversa"}</p>
                <p className="text-xs text-slate-400">{selectedConversation ? "Mensagens privadas" : "Escolha uma conversa para começar"}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#fbfcfe] px-4 py-5 sm:px-6">
              {!selected && (
                <div className="flex h-full min-h-[480px] items-center justify-center text-center">
                  <div className="max-w-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#eef2f8] text-[#0C1A3D]"><ResaIcon name="send" size={24} /></div>
                    <h2 className="mt-5 text-lg font-semibold text-[#0C1A3D]">A sua caixa de entrada</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Escolha uma conversa existente ou crie uma nova para começar a comunicar.</p>
                  </div>
                </div>
              )}
              {selected && loadingMessages && !messages.length && <p className="py-10 text-center text-sm text-slate-400">A carregar mensagens…</p>}
              {selected && !loadingMessages && !messages.length && (
                <div className="flex min-h-[430px] items-center justify-center text-center">
                  <div>
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-[#0C1A3D] shadow-sm"><ResaIcon name="message" size={22} /></div>
                    <p className="mt-4 text-sm font-semibold text-[#0C1A3D]">Sem mensagens ainda</p>
                    <p className="mt-1 text-xs text-slate-500">Envie a primeira mensagem desta conversa.</p>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {messages.map((message) => (
                  <div key={message.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{message.body}</p>
                    <p className="mt-2 text-[11px] text-slate-400">{formatDate(message.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>

            {selected && (
              <div className="border-t border-slate-100 bg-white p-4">
                <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-[#9aa9c6]">
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                    className="min-h-[48px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400"
                    placeholder="Escreva uma mensagem…"
                    rows={1}
                    maxLength={10000}
                  />
                  <button onClick={() => void send()} disabled={!body.trim() || sending} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0C1A3D] text-white transition hover:bg-[#122858] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Enviar mensagem">
                    <ResaIcon name="send" size={18} />
                  </button>
                </div>
                <p className="mt-2 px-2 text-[11px] text-slate-400">Enter envia · Shift + Enter cria uma nova linha</p>
              </div>
            )}
          </section>
        </section>
      </div>

      {newOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#061127]/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[28px] border border-white/60 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Nova conversa</p>
                <h2 className="mt-1 text-xl font-semibold text-[#0C1A3D]">Encontre uma pessoa</h2>
                <p className="mt-1 text-sm text-slate-500">Pesquise pelo nome ou perfil para iniciar uma conversa privada.</p>
              </div>
              <button onClick={() => setNewOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><ResaIcon name="close" size={16} /></button>
            </div>
            <div className="mt-5 flex gap-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void searchPeople(); }}
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#9aa9c6]"
                placeholder="Nome ou perfil…"
              />
              <button onClick={() => void searchPeople()} disabled={loadingPeople || query.trim().length < 2} className="rounded-2xl bg-[#0C1A3D] px-5 text-sm font-semibold text-white disabled:opacity-40">
                {loadingPeople ? "A pesquisar…" : "Pesquisar"}
              </button>
            </div>
            <div className="mt-4 max-h-72 overflow-y-auto">
              {people.map((person) => (
                <button key={person.id} onClick={() => void startConversation(person)} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-slate-50">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eef2f8] text-sm font-bold text-[#0C1A3D]">{(person.title || "P").slice(0, 1).toUpperCase()}</div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#0C1A3D]">{person.title || "Perfil"}</p>
                    <p className="truncate text-xs text-slate-500">{person.body || person.entity_type || "Membro RESA"}</p>
                  </div>
                </button>
              ))}
              {query.trim().length >= 2 && !loadingPeople && !people.length && <p className="py-8 text-center text-sm text-slate-400">Nenhum perfil encontrado.</p>}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
