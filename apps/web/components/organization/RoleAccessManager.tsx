"use client";

import { useCallback, useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import { createClient } from "@/lib/supabase/client";
import { OrganizationSelector, type ZionOrganization } from "@/components/organization/OrganizationSelector";

type RoleOption = { id: string; key: string; name: string };
type Membership = {
  id: string;
  user_id: string;
  status: string;
  role_id: string;
  roles?: { key?: string; name?: string } | Array<{ key?: string; name?: string }> | null;
};

function roleName(role: Membership["roles"], fallback?: string) {
  const item = Array.isArray(role) ? role[0] : role;
  return item?.name ?? item?.key ?? fallback ?? "Papel não identificado";
}

export default function RoleAccessManager() {
  const [organizationId, setOrganizationId] = useState("");
  const [organization, setOrganization] = useState<ZionOrganization | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [canAssign, setCanAssign] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const app = auth.user?.app_metadata ?? {};
      const isVerifiedGlobalAdmin = app.zion_global_role === "global_admin" && app.zion_verified === true;
      const [roleResult, actorResult, memberResult] = await Promise.all([
        supabase.from("roles").select("id,key,name").order("name"),
        supabase.from("organization_memberships").select("roles(key)").eq("organization_id", id).eq("user_id", auth.user?.id ?? "").eq("status", "ACTIVE"),
        resaRequest<Membership[]>("/v1/organizations/" + encodeURIComponent(id) + "/memberships"),
      ]);

      if (roleResult.error) throw roleResult.error;
      if (actorResult.error && !isVerifiedGlobalAdmin) throw actorResult.error;
      setRoles((roleResult.data ?? []) as RoleOption[]);
      setMemberships(memberResult ?? []);

      const isOrganizationOwner = (actorResult.data ?? []).some((row: any) => {
        const nested = Array.isArray(row.roles) ? row.roles[0] : row.roles;
        return nested?.key === "organization_owner";
      });
      setCanAssign(isVerifiedGlobalAdmin || isOrganizationOwner);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar as permissões da organização.");
      setMemberships([]);
      setCanAssign(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (organizationId) void load(organizationId);
  }, [organizationId, load]);

  async function changeRole(item: Membership, roleId: string) {
    if (!organizationId || !roleId || savingId || item.status.toUpperCase() !== "ACTIVE") return;
    setSavingId(item.id);
    setError("");
    setNotice("");
    try {
      await resaRequest(
        "/v1/organizations/" + encodeURIComponent(organizationId) + "/memberships/" + encodeURIComponent(item.id),
        { method: "PATCH", body: JSON.stringify({ role_id: roleId }) },
      );
      await load(organizationId);
      setNotice("Função atualizada. A alteração ficou registada no histórico de auditoria.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar a função. Confirme a autoridade de quem está a atribuir.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9B7A34]">Controlo de acesso</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0C1A3D]">Funções e permissões</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Atribua a cada pessoa a função institucional adequada. A função define a área de entrada; a API e a base de dados continuam a validar cada operação.</p>
        </div>
        <OrganizationSelector value={organizationId} onChange={(id, selected) => { setOrganization(selected); setOrganizationId(id); }} />
      </div>
      {organization && <p className="mt-3 text-xs text-slate-500">Organização: <strong className="text-slate-700">{organization.name}</strong></p>}
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {!canAssign && organizationId && !loading && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">A consulta está disponível, mas a atribuição de funções exige Global Admin verificado ou proprietário autorizado da organização.</p>
      )}
      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <div className="hidden grid-cols-[minmax(0,1fr)_minmax(180px,0.8fr)_auto] gap-4 bg-[#F8F9FB] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:grid">
          <span>Conta</span><span>Função atribuída</span><span>Estado</span>
        </div>
        {loading && <p className="p-6 text-sm text-slate-500">A carregar membros e funções…</p>}
        {!loading && !organizationId && <p className="p-6 text-sm text-slate-500">Selecione uma organização para gerir as funções.</p>}
        {!loading && organizationId && memberships.length === 0 && <p className="p-6 text-sm text-slate-500">Não há membros registados nesta organização.</p>}
        {!loading && memberships.length > 0 && (
          <div className="divide-y divide-slate-100">
            {memberships.map((item) => {
              const currentRole = Array.isArray(item.roles) ? item.roles[0] : item.roles;
              const isOwnerRole = currentRole?.key === "organization_owner" || roles.find((role) => role.id === item.role_id)?.key === "organization_owner";
              return (
              <div key={item.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.8fr)_auto] sm:items-center">
                <p className="truncate font-mono text-xs text-slate-700" title={item.user_id}>{item.user_id}</p>
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">Função atribuída</p>
                  {canAssign ? (
                    <select
                      aria-label={"Função de " + item.user_id}
                      value={item.role_id}
                      disabled={savingId === item.id || item.status.toUpperCase() !== "ACTIVE" || isOwnerRole}
                      onChange={(event) => void changeRole(item, event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#C8A24A] disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      {roles.map((role) => <option key={role.id} value={role.id} disabled={role.key === "organization_owner"}>{role.name}</option>)}
                    </select>
                  ) : (
                    <p className="text-sm text-slate-600">{roleName(item.roles, roles.find((role) => role.id === item.role_id)?.name)}</p>
                  )}
                </div>
                <span className={item.status.toUpperCase() === "ACTIVE" ? "w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800" : "w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"}>{item.status}</span>
              </div>
            );})}
          </div>
        )}
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-400">O perfil de proprietário da organização não pode ser atribuído através desta lista. As alterações de função são verificadas por políticas RLS e registadas no histórico de auditoria.</p>
    </section>
  );
}
