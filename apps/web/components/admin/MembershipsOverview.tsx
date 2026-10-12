"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import { OrganizationSelector, type ZionOrganization } from "@/components/organization/OrganizationSelector";

type Membership = {
  id: string;
  user_id: string;
  status: string;
  joined_at: string;
  role_id?: string | null;
  roles?: { key?: string; name?: string } | Array<{ key?: string; name?: string }> | null;
};

function roleLabel(role: Membership["roles"]) {
  const value = Array.isArray(role) ? role[0] : role;
  return value?.name ?? value?.key ?? "Papel não identificado";
}

export default function MembershipsOverview() {
  const [organizationId, setOrganizationId] = useState("");
  const [organization, setOrganization] = useState<ZionOrganization | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const result = await resaRequest<Membership[]>(`/v1/organizations/${encodeURIComponent(id)}/memberships`);
      setMemberships(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar as adesões da organização.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (organizationId) void load(organizationId);
  }, [organizationId, load]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return memberships.filter((item) =>
      [item.user_id, item.status, roleLabel(item.roles)].some((value) => value.toLocaleLowerCase().includes(normalized)),
    );
  }, [memberships, query]);

  async function addExistingProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const userId = newUserId.trim();
    if (!organizationId || !userId || adding) return;
    setError("");
    setMessage("");
    const existing = memberships.find((item) => item.user_id.toLowerCase() === userId.toLowerCase());
    if (existing) {
      setError("Este perfil já tem uma adesão nesta organização. Não foi criado um registo duplicado.");
      return;
    }
    setAdding(true);
    try {
      const created = await resaRequest<Membership>(
        `/v1/organizations/${encodeURIComponent(organizationId)}/memberships`,
        { method: "POST", body: JSON.stringify({ user_id: userId, status: "ACTIVE" }) },
      );
      setMemberships((current) => [created, ...current]);
      setNewUserId("");
      setShowAddForm(false);
      setMessage("Perfil associado à organização. Os dados de identidade existentes foram preservados.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível associar o perfil. Confirme a existência do perfil e as permissões institucionais.");
    } finally {
      setAdding(false);
    }
  }

  async function changeStatus(item: Membership) {
    const nextStatus = item.status.toUpperCase() === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (!organizationId || savingId) return;
    setSavingId(item.id);
    setError("");
    setMessage("");
    try {
      const updated = await resaRequest<Membership>(
        `/v1/organizations/${encodeURIComponent(organizationId)}/memberships/${encodeURIComponent(item.id)}`,
        { method: "PATCH", body: JSON.stringify({ status: nextStatus }) },
      );
      setMemberships((current) => current.map((membership) => membership.id === item.id ? { ...membership, ...updated, roles: updated.roles ?? membership.roles } : membership));
      setMessage(nextStatus === "ACTIVE" ? "Adesão reativada." : "Adesão desativada.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar a adesão. Confirme as permissões da organização.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section id="membership-governance" className="mt-8 scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9B7A34]">Gestão de adesões</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0C1A3D]">Membros da organização</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Consulte adesões reais, papel atribuído e estado. As alterações são enviadas à API e dependem das permissões institucionais existentes.</p>
        </div>
        <OrganizationSelector value={organizationId} onChange={(id, selected) => { setOrganization(selected); setOrganizationId(id); }} />
      </div>
      {organization && <p className="mt-3 text-xs text-slate-500">Organização: <strong className="text-slate-700">{organization.name}</strong></p>}
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-semibold text-[#0C1A3D]">Registo de membros</p><p className="mt-1 text-xs leading-5 text-slate-500">Associe um perfil ZION existente à organização, sem duplicar a identidade.</p></div>
        <button type="button" onClick={() => { setShowAddForm((value) => !value); setError(""); }} disabled={!organizationId} className="rounded-xl bg-[#0C1A3D] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#152954] disabled:cursor-not-allowed disabled:opacity-40">{showAddForm ? "Fechar formulário" : "Adicionar membro existente"}</button>
      </div>
      {showAddForm && <form onSubmit={addExistingProfile} className="mt-4 grid gap-4 rounded-2xl border border-[#D9BD78]/40 bg-[#FBFAF6] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-5">
        <label className="block text-xs font-semibold text-slate-600">Identificador do perfil ZION (UUID)
          <input value={newUserId} onChange={(event) => setNewUserId(event.target.value)} required minLength={20} maxLength={80} autoComplete="off" spellCheck={false} placeholder="Cole o ID do perfil existente" className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-mono font-normal text-slate-800 outline-none focus:border-[#B99A52] focus:ring-4 focus:ring-[#B99A52]/10" />
        </label>
        <button type="submit" disabled={adding || !newUserId.trim()} className="min-h-12 rounded-xl bg-[#9B7A34] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#806328] disabled:cursor-not-allowed disabled:opacity-50">{adding ? "A associar…" : "Associar perfil"}</button>
        <p className="sm:col-span-2 text-xs leading-5 text-slate-500">A identidade e os dados de perfil existentes não são recriados. O sistema impede duplicação na lista desta organização. A API e as políticas institucionais continuam a decidir se a associação é autorizada.</p>
      </form>}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar por identificador, papel ou estado…" aria-label="Pesquisar membros" className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#C8A24A]" />
        <button type="button" onClick={() => void load(organizationId)} disabled={!organizationId || loading} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#0C1A3D] hover:border-[#C8A24A] disabled:opacity-40">{loading ? "A carregar…" : "Atualizar lista"}</button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-800">{memberships.filter((item) => item.status.toUpperCase() === "ACTIVE").length} ativos</span>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-600">{memberships.filter((item) => item.status.toUpperCase() !== "ACTIVE").length} inativos / outros estados</span>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <div className="hidden grid-cols-[minmax(0,1.5fr)_1fr_1fr_auto] gap-4 bg-[#F8F9FB] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:grid">
          <span>Identificador</span><span>Papel</span><span>Entrada</span><span>Estado / ação</span>
        </div>
        {loading && memberships.length === 0 ? <p className="p-6 text-sm text-slate-500">A carregar adesões…</p>
          : filtered.length === 0 ? <p className="p-6 text-sm text-slate-500">{organizationId ? "Não há adesões que correspondam à pesquisa." : "Selecione uma organização para consultar os membros."}</p>
          : <div className="divide-y divide-slate-100">{filtered.map((item) => (
            <div key={item.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1.5fr)_1fr_1fr_auto] sm:items-center sm:gap-4">
              <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:hidden">Identificador</p><p title={item.user_id} className="truncate font-mono text-xs text-slate-700">{item.user_id}</p></div>
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:hidden">Papel</p><p className="text-sm text-slate-600">{roleLabel(item.roles)}</p></div>
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:hidden">Entrada</p><p className="text-sm text-slate-500">{item.joined_at ? new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(new Date(item.joined_at)) : "—"}</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${item.status.toUpperCase() === "ACTIVE" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{item.status}</span>
                <button type="button" disabled={savingId === item.id} onClick={() => void changeStatus(item)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#0C1A3D] hover:border-[#C8A24A] disabled:opacity-40">{savingId === item.id ? "A guardar…" : item.status.toUpperCase() === "ACTIVE" ? "Desativar" : "Reativar"}</button>
              </div>
            </div>
          ))}</div>}
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-400">Privacidade: a interface apresenta apenas os campos fornecidos pela API de adesões. Pedidos de transferência exigem um workflow próprio de origem, destino, aprovação e histórico; não são simulados nesta lista.</p>
    </section>
  );
}
