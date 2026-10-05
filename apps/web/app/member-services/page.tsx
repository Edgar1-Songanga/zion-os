"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Organization = { id: string; name: string; organization_type?: string };
type RequestItem = { id: string; service_type: string; status: string; subject: string; applicant_notes?: string; created_at: string; organization?: { id: string; name: string }; destination?: { id: string; name: string } };
const types = [
  ["MEMBERSHIP_TRANSFER", "Transferência de membro"],
  ["RECOMMENDATION_LETTER", "Carta de recomendação"],
  ["CHILD_DEDICATION", "Dedicação de criança"],
  ["BAPTISM_REQUEST", "Pedido de batismo"],
  ["PASTORAL_VISIT", "Visita pastoral"],
  ["GENERAL_SECRETARY_SERVICE", "Outro serviço da secretaria"],
] as const;
const labels: Record<string, string> = Object.fromEntries(types);
export default function MemberServicesPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [message, setMessage] = useState("A carregar os seus serviços…");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ organization_id: "", destination_organization_id: "", service_type: "MEMBERSHIP_TRANSFER", subject: "", applicant_notes: "", details: "" });
  const load = useCallback(async () => {
    try {
      const [orgs, mine] = await Promise.all([resaRequest<Organization[]>("/v1/organizations/directory"), resaRequest<RequestItem[]>("/v1/member-services/mine")]);
      setOrganizations(orgs); setRequests(mine); if (!form.organization_id && orgs[0]) setForm((current) => ({ ...current, organization_id: orgs[0].id })); setMessage("");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Não foi possível carregar os serviços."); }
  }, [form.organization_id]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      let details: Record<string, unknown> = {};
      if (form.details.trim()) { try { details = JSON.parse(form.details); } catch { details = { description: form.details.trim() }; } }
      await resaRequest("/v1/member-services", { method: "POST", body: JSON.stringify({ organization_id: form.organization_id, destination_organization_id: form.service_type === "MEMBERSHIP_TRANSFER" ? form.destination_organization_id : undefined, service_type: form.service_type, subject: form.subject, applicant_notes: form.applicant_notes, details }) });
      setForm((current) => ({ ...current, subject: "", applicant_notes: "", details: "", destination_organization_id: "" })); await load();
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Não foi possível enviar o pedido."); } finally { setBusy(false); }
  }
  async function cancel(id: string) { setBusy(true); try { await resaRequest(`/v1/member-services/${id}/cancel`, { method: "POST" }); await load(); } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Não foi possível cancelar o pedido."); } finally { setBusy(false); } }
  return <main className="min-h-screen bg-slate-100 p-8"><div className="mx-auto max-w-6xl space-y-8"><header className="rounded-3xl bg-[#0C1A3D] p-8 text-white shadow-xl"><p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#D4AF37]">Member services</p><h1 className="mt-3 text-4xl font-bold">Serviços da Secretaria</h1><p className="mt-3 max-w-3xl text-white/70">Faça pedidos à sua igreja, acompanhe o estado e mantenha o seu histórico num só lugar.</p></header>{message && <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-600">{message}</div>}<section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]"><form onSubmit={submit} className="rounded-3xl bg-white p-7 shadow-sm"><h2 className="text-xl font-bold text-[#0C1A3D]">Novo pedido</h2><label className="mt-5 block text-sm font-semibold text-slate-700">Igreja / organização<select required value={form.organization_id} onChange={(event) => setForm({ ...form, organization_id: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal"><option value="">Selecione…</option>{organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="mt-4 block text-sm font-semibold text-slate-700">Tipo de serviço<select required value={form.service_type} onChange={(event) => setForm({ ...form, service_type: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal">{types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{form.service_type === "MEMBERSHIP_TRANSFER" && <label className="mt-4 block text-sm font-semibold text-slate-700">Igreja de destino<select required value={form.destination_organization_id} onChange={(event) => setForm({ ...form, destination_organization_id: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal"><option value="">Selecione…</option>{organizations.filter((item) => item.id !== form.organization_id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}<label className="mt-4 block text-sm font-semibold text-slate-700">Assunto<input required value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal" placeholder={form.service_type === "CHILD_DEDICATION" ? "Dedicação de Ana Silva" : "Descreva o pedido"} /></label><label className="mt-4 block text-sm font-semibold text-slate-700">Detalhes<textarea value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal" placeholder="Para dedicação: nome da criança, data de nascimento, nomes dos responsáveis e data preferida." /></label><label className="mt-4 block text-sm font-semibold text-slate-700">Mensagem para a secretaria<textarea value={form.applicant_notes} onChange={(event) => setForm({ ...form, applicant_notes: event.target.value })} className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label><button disabled={busy} className="mt-5 rounded-xl bg-[#0C1A3D] px-5 py-3 font-semibold text-white disabled:opacity-50">Enviar pedido</button></form><div className="rounded-3xl bg-white p-7 shadow-sm"><h2 className="text-xl font-bold text-[#0C1A3D]">Os meus pedidos</h2><div className="mt-5 space-y-4">{requests.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#8B6F16]">{labels[item.service_type] ?? item.service_type}</p><h3 className="mt-1 font-semibold text-[#0C1A3D]">{item.subject}</h3><p className="mt-1 text-sm text-slate-500">{item.organization?.name}{item.destination ? ` → ${item.destination.name}` : ""}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{item.status}</span></div><p className="mt-3 text-xs text-slate-400">Criado em {new Date(item.created_at).toLocaleString()}</p>{["SUBMITTED", "IN_REVIEW"].includes(item.status) && <button disabled={busy} onClick={() => void cancel(item.id)} className="mt-4 text-sm font-semibold text-red-700">Cancelar pedido</button>}</article>)}{!requests.length && <p className="rounded-xl bg-slate-50 p-5 text-slate-500">Ainda não tem pedidos. Pode iniciar um à esquerda.</p>}</div></div></section></div></main>;
}
