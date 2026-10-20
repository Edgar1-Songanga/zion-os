"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { resaRequest } from "@/lib/resa/api";
import { createClient } from "@/lib/supabase/client";
import { YOUTH_PROGRAMS } from "@/components/youth/core/YouthProgram";

type Organization = { id: string; name: string; organization_type: string; parent_id: string | null };
type Club = { id: string; organizationId: string; name: string; programId: string; status: "ACTIVE" | "INACTIVE"; logoUrl?: string | null; coverImageUrl?: string | null };
type ClubMember = { clubId: string; userId: string; status: "ACTIVE" | "INACTIVE"; joinedAt: string };

export default function YouthPersonalJourney() {
  const [answer, setAnswer] = useState<"yes" | "no" | "">("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [programId, setProgramId] = useState("");
  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubId, setClubId] = useState("");
  const [memberships, setMemberships] = useState<Club[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(true);
  const [loadingClubs, setLoadingClubs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    resaRequest<Organization[]>("/v1/organizations")
      .then((rows) => {
        if (!active) return;
        setOrganizations(rows);
        if (rows[0]) setOrganizationId(rows[0].id);
      })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Não foi possível carregar as organizações."); })
      .finally(() => { if (active) setLoadingOrganizations(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    async function restoreMembership() {
      try {
        const supabase = createClient();
        const { data: userResult, error: userError } = await supabase.auth.getUser();
        if (userError || !userResult.user) return;
        // RLS limits this query to the authenticated member's own club memberships.
        const { data: rows, error: membershipError } = await supabase
          .from("youth_club_members")
          .select("club_id,status,joined_at")
          .eq("user_id", userResult.user.id)
          .eq("status", "ACTIVE")
          .order("joined_at", { ascending: false });
        if (membershipError) throw membershipError;
        if (!active || !rows?.length) return;
        const clubResults = await Promise.all(rows.map(async (row) => {
          try {
            return await resaRequest<Club>(`/v1/youth/clubs/${encodeURIComponent(row.club_id)}`);
          } catch {
            return null;
          }
        }));
        if (!active) return;
        const existing = clubResults.filter((club): club is Club => Boolean(club && club.status === "ACTIVE"));
        if (existing.length) {
          setMemberships(existing);
          setOrganizationId(existing[0].organizationId);
          setProgramId(existing[0].programId);
          setClubId(existing[0].id);
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Não foi possível recuperar a associação ao clube.");
      }
    }
    void restoreMembership();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!organizationId) { setClubs([]); return; }
    let active = true;
    setLoadingClubs(true);
    setError("");
    resaRequest<Club[]>(`/v1/youth/clubs/organization/${encodeURIComponent(organizationId)}`)
      .then((rows) => { if (active) setClubs(rows.filter((club) => club.status === "ACTIVE")); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Não foi possível carregar os clubes."); })
      .finally(() => { if (active) setLoadingClubs(false); });
    return () => { active = false; };
  }, [organizationId]);

  const programsWithClubs = useMemo(() => new Set(clubs.map((club) => club.programId)), [clubs]);
  const availablePrograms = useMemo(() => YOUTH_PROGRAMS.filter((program) => programsWithClubs.has(program.id)), [programsWithClubs]);
  const filteredClubs = useMemo(() => clubs.filter((club) => !programId || club.programId === programId), [clubs, programId]);

  useEffect(() => {
    if (programId && !availablePrograms.some((program) => program.id === programId)) setProgramId("");
  }, [availablePrograms, programId]);

  async function associateClub() {
    if (!clubId || saving) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const supabase = createClient();
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user) throw new Error("A sessão expirou. Entre novamente para continuar.");
      await resaRequest(`/v1/youth/clubs/${encodeURIComponent(clubId)}/members`, {
        method: "POST",
        body: JSON.stringify({ user_id: data.user.id }),
      });
      const selected = clubs.find((club) => club.id === clubId);
      if (!selected) throw new Error("O clube selecionado já não está disponível. Atualize a lista.");
      setMemberships((current) => current.some((club) => club.id === selected.id) ? current : [selected, ...current]);
      setMessage("A sua conta foi associada ao clube. A progressão será apresentada quando existirem registos reais de formação.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível associar a conta ao clube.");
    } finally { setSaving(false); }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--zion-border)] bg-white shadow-[var(--zion-shadow-sm)]">
      <div className="bg-[var(--zion-primary)] px-6 py-5 text-white sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Ministério Jovem</p>
        <h2 className="mt-2 text-2xl font-semibold">O meu clube e a minha formação</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">Associe o seu perfil a um clube real e aceda ao percurso de formação adequado ao seu programa.</p>
      </div>

      <div className="space-y-5 p-6 sm:p-8">
        {memberships.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">Os meus clubes ativos</p>
            {memberships.map((club) => (
              <div key={club.id} className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
                <div className="relative flex items-center gap-4 bg-gradient-to-r from-[#0C1A3D] to-[#1B3768] p-5 text-white">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-[#D9BC70] bg-white/10 text-lg font-bold shadow-lg ring-4 ring-[#D9BC70]/15">
                    {club.logoUrl ? <img src={club.logoUrl} alt={`Fotografia de perfil do clube ${club.name}`} className="h-full w-full object-cover" loading="lazy" /> : <span>{club.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "Z"}</span>}
                  </div>
                  <div className="min-w-0"><h3 className="text-lg font-semibold">{club.name}</h3>
                    <p className="mt-1 text-sm text-white/75">{YOUTH_PROGRAMS.find((program) => program.id === club.programId)?.name ?? club.programId} · Associação ativa</p></div>
                </div>
                <div className="p-5">
                <button type="button" onClick={() => { setOrganizationId(club.organizationId); setProgramId(club.programId); setClubId(club.id); }} className="rounded-lg border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-950">Abrir este percurso</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => { setAnswer("yes"); setMemberships([]); setMessage(""); }} className="text-sm font-semibold text-[var(--zion-primary)] underline">Associar outro clube</button>
          </div>
        ) : (
          <>
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-[var(--zion-dark)]">Já pertence a um clube deste ministério?</legend>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--zion-border)] p-4">
                <input type="radio" name="youth-club-status" checked={answer === "yes"} onChange={() => { setAnswer("yes"); setError(""); setMessage(""); }} className="mt-1" />
                <span><span className="block text-sm font-semibold text-[var(--zion-dark)]">Sim, já pertenço a um clube</span><span className="mt-1 block text-xs leading-5 text-[var(--zion-muted)]">Vou localizar o clube e associar a minha conta.</span></span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--zion-border)] p-4">
                <input type="radio" name="youth-club-status" checked={answer === "no"} onChange={() => { setAnswer("no"); setClubId(""); setError(""); setMessage(""); }} className="mt-1" />
                <span><span className="block text-sm font-semibold text-[var(--zion-dark)]">Ainda não pertenço a um clube</span><span className="mt-1 block text-xs leading-5 text-[var(--zion-muted)]">Não será feita nenhuma associação. Pode explorar a área ministerial e procurar orientação para participar num clube.</span></span>
              </label>
            </fieldset>

            {answer === "yes" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-[var(--zion-dark)]">Organização / região
                  <select value={organizationId} onChange={(event) => { setOrganizationId(event.target.value); setClubId(""); }} disabled={loadingOrganizations || organizations.length === 0} className="w-full rounded-xl border border-[var(--zion-border)] bg-white px-3 py-3">
                    {organizations.length === 0 && <option value="">Nenhuma organização disponível</option>}
                    {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name} · {organization.organization_type}</option>)}
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium text-[var(--zion-dark)]">Programa
                  <select value={programId} onChange={(event) => { setProgramId(event.target.value); setClubId(""); }} disabled={loadingClubs || availablePrograms.length === 0} className="w-full rounded-xl border border-[var(--zion-border)] bg-white px-3 py-3">
                    <option value="">Todos os programas disponíveis</option>
                    {availablePrograms.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium text-[var(--zion-dark)] sm:col-span-2">O seu clube
                  <select value={clubId} onChange={(event) => setClubId(event.target.value)} disabled={loadingClubs || filteredClubs.length === 0} className="w-full rounded-xl border border-[var(--zion-border)] bg-white px-3 py-3">
                    <option value="">{loadingClubs ? "A carregar clubes…" : "Selecione um clube registado"}</option>
                    {filteredClubs.map((club) => <option key={club.id} value={club.id}>{club.name} · {YOUTH_PROGRAMS.find((program) => program.id === club.programId)?.name ?? club.programId}</option>)}
                  </select>
                </label>
                {!loadingClubs && answer === "yes" && filteredClubs.length === 0 && <p className="text-sm text-[var(--zion-muted)] sm:col-span-2">Não existem clubes ativos registados nesta organização para a seleção atual. Não vamos apresentar clubes fictícios. Se o seu clube ainda não estiver no ZION OS, a direção autorizada deverá registá-lo.</p>}
                <button type="button" onClick={() => void associateClub()} disabled={!clubId || saving} className="w-fit rounded-xl bg-[var(--zion-primary)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? "A associar…" : "Confirmar o meu clube"}</button>
              </div>
            )}
          </>
        )}

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}

        {answer === "no" && <div className="rounded-xl bg-[var(--zion-light)] p-4 text-sm leading-6 text-[var(--zion-muted)]">A seleção de clube fica encerrada por agora. Pode voltar a esta secção quando passar a pertencer a um clube.</div>}

        <div className="flex flex-col gap-3 border-t border-[var(--zion-border)] pt-5 sm:flex-row sm:items-center">
          <div className="flex-1"><p className="text-sm font-semibold text-[var(--zion-dark)]">Pronto para avançar?</p><p className="mt-1 text-xs leading-5 text-[var(--zion-muted)]">O percurso e o progresso dependem dos registos reais do seu clube e da validação dos requisitos.</p></div>
          <Link href="/youth" className="rounded-xl border border-[var(--zion-border)] px-5 py-3 text-center text-sm font-semibold text-[var(--zion-dark)] transition hover:border-[var(--zion-gold)]">Explorar formação</Link>
        </div>
      </div>
    </section>
  );
}
