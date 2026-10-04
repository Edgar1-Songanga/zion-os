"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Conversation = { id: string; title?: string | null; kind: string; updated_at?: string };
type Message = { id: string; sender_id: string; body: string; created_at: string };

export default function MessagesPage() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void resaRequest<Conversation[]>("/v1/resa/conversations").then(setItems).catch(e => setError(e instanceof Error ? e.message : "Não foi possível carregar as conversas.")); }, []);
  useEffect(() => { if (!selected) return; void resaRequest<Message[]>("/v1/resa/conversations/" + selected + "/messages").then(setMessages).catch(e => setError(e instanceof Error ? e.message : "Não foi possível carregar as mensagens.")); }, [selected]);
  async function send() { if (!selected || !body.trim()) return; try { const msg = await resaRequest<Message>("/v1/resa/conversations/" + selected + "/messages", { method: "POST", body: JSON.stringify({ body }) }); setMessages(v => [msg, ...v]); setBody(""); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível enviar a mensagem."); } }
  return <main className="min-h-screen bg-slate-100 p-8"><div className="mx-auto max-w-6xl"><h1 className="text-3xl font-semibold text-[#0C1A3D]">Mensagens</h1>{error && <p role="alert" className="mt-6 rounded-2xl bg-red-50 p-4 text-red-700">{error}</p>}<div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]"><aside className="rounded-3xl border bg-white p-4">{items.map(item => <button key={item.id} onClick={() => setSelected(item.id)} className="block w-full rounded-2xl p-4 text-left hover:bg-slate-50">{item.title || "Conversa " + item.kind}</button>)}{!items.length && <p className="p-4 text-sm text-slate-500">Nenhuma conversa.</p>}</aside><section className="rounded-3xl border bg-white p-6"><div className="space-y-3">{messages.map(m => <div key={m.id} className="rounded-2xl bg-slate-50 p-3"><p>{m.body}</p><span className="text-xs text-slate-400">{new Date(m.created_at).toLocaleString("pt-PT")}</span></div>)}</div>{selected && <div className="mt-6 flex gap-2"><input value={body} onChange={e => setBody(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void send(); }} className="flex-1 rounded-xl border px-4 py-3" placeholder="Escreva uma mensagem..." /><button onClick={() => void send()} className="rounded-xl bg-[#0C1A3D] px-5 py-3 text-white">Enviar</button></div>}</section></div></div></main>;
}
