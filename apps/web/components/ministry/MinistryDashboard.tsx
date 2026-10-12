"use client";

import { useEffect, useState, type FormEvent } from "react";
import Card from "../ui/Card";
import StatCard from "../ui/StatCard";
import { resaRequest } from "@/lib/resa/api";
import { getMinistryCatalogEntry } from "./ministry-catalog";
import type { Ministry } from "./types";

interface MinistryDashboardProps {
  ministry: Ministry;
  onUpdated?: (ministry: Ministry) => void;
}

interface MinistryProfileForm {
  name: string;
  department: string;
  description: string;
  philosophy: string;
  coverImageUrl: string;
  focusAreas: string;
  ageRange: string;
  officialUrl: string;
  sourceLabel: string;
}

function formFromMinistry(ministry: Ministry): MinistryProfileForm {
  const catalog = getMinistryCatalogEntry(ministry.department) ?? getMinistryCatalogEntry(ministry.name);
  return {
    name: ministry.name,
    department: ministry.department,
    description: ministry.description || catalog?.summary || "",
    philosophy: ministry.philosophy || catalog?.mission || "",
    coverImageUrl: ministry.coverImageUrl ?? catalog?.coverImage ?? "",
    focusAreas: (ministry.focusAreas?.length ? ministry.focusAreas : catalog?.focusAreas ?? []).join("\n"),
    ageRange: ministry.ageRange ?? catalog?.ageRange ?? "",
    officialUrl: ministry.officialUrl ?? catalog?.officialUrl ?? "",
    sourceLabel: ministry.sourceLabel ?? catalog?.sourceLabel ?? "",
  };
}

export default function MinistryDashboard({ ministry, onUpdated }: MinistryDashboardProps) {
  const catalogEntry = getMinistryCatalogEntry(ministry.department) ?? getMinistryCatalogEntry(ministry.name);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [form, setForm] = useState<MinistryProfileForm>(() => formFromMinistry(ministry));

  useEffect(() => {
    setForm(formFromMinistry(ministry));
    setSaveError(null);
  }, [
    ministry.id,
    ministry.name,
    ministry.department,
    ministry.description,
    ministry.philosophy,
    ministry.coverImageUrl,
    ministry.focusAreas,
    ministry.ageRange,
    ministry.officialUrl,
    ministry.sourceLabel,
  ]);

  const coverImage = ministry.coverImageUrl ?? catalogEntry?.coverImage;
  const summary = ministry.description || catalogEntry?.summary || "A descrição deste ministério ainda não foi preenchida.";
  const mission = ministry.philosophy || catalogEntry?.mission;
  const focusAreas = ministry.focusAreas?.length ? ministry.focusAreas : catalogEntry?.focusAreas ?? [];
  const ageRange = ministry.ageRange ?? catalogEntry?.ageRange;
  const officialUrl = ministry.officialUrl ?? catalogEntry?.officialUrl;
  const sourceLabel = ministry.sourceLabel ?? catalogEntry?.sourceLabel;
  const programs = ministry.programs ?? [];
  const reports = ministry.reports ?? [];
  const activeProgramCount = programs.filter((program) => program.status.toLowerCase() === "active").length;
  const plannedProgramCount = programs.filter((program) => program.status.toLowerCase() === "planned").length;
  const pendingReportCount = reports.filter((report) => report.status.toLowerCase() === "pending").length;
  const participation = ministry.metrics?.participation;
  const growth = ministry.metrics?.growth;
  const impact = ministry.metrics?.impact;

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const updated = await resaRequest<Ministry>(`/v1/ministries/${encodeURIComponent(ministry.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name.trim(),
          department: form.department.trim() || "MINISTRY",
          description: form.description.trim(),
          philosophy: form.philosophy.trim(),
          cover_image_url: form.coverImageUrl.trim() || null,
          focus_areas: form.focusAreas.split(/[\n,]/).map((value) => value.trim()).filter(Boolean),
          age_range: form.ageRange.trim() || null,
          official_url: form.officialUrl.trim() || null,
          source_label: form.sourceLabel.trim() || null,
        }),
      });
      onUpdated?.({ ...ministry, ...updated, status: ministry.status });
      setSaveMessage("Perfil ministerial atualizado.");
      setEditing(false);
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : "Não foi possível guardar o perfil ministerial.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="overflow-hidden rounded-2xl border border-slate-100">
          {coverImage && (
            <div className="relative h-56 sm:h-72">
              <img src={coverImage} alt={`Fotografia ilustrativa: ${ministry.name}`} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071126]/90 via-[#071126]/20 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 sm:bottom-7 sm:left-7">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E2C477]">{catalogEntry?.category ?? ministry.department}</p>
                <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">{ministry.name}</h1>
                {ageRange && <p className="mt-2 text-sm text-slate-200">{ageRange}</p>}
              </div>
            </div>
          )}
          <div className="space-y-5 p-5 sm:p-7">
            {!coverImage && (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B18B36]">{ministry.department}</p>
                <h1 className="text-3xl font-semibold text-[#0C1A3D] sm:text-4xl">{ministry.name}</h1>
              </>
            )}
            <p className="max-w-4xl text-base leading-7 text-slate-600">{summary}</p>
            {mission && (
              <div className="rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6F16]">Missão e propósito</p>
                <p className="mt-2 text-base font-medium leading-7 text-[#0C1A3D]">{mission}</p>
              </div>
            )}
            {focusAreas.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-[#0C1A3D]">Áreas de atuação</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {focusAreas.map((focus) => <span key={focus} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">{focus}</span>)}
                </div>
              </div>
            )}
            {officialUrl && (
              <a href={officialUrl} target="_blank" rel="noreferrer" className="inline-flex text-sm font-semibold text-[#0C1A3D] underline decoration-[#C8A24A] underline-offset-4">
                Consultar referência oficial: {sourceLabel ?? "Igreja Adventista"}
              </a>
            )}
            <div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 xl:grid-cols-4">
              <div><p className="text-xs text-slate-400">Igreja / organização</p><p className="mt-1 font-semibold text-[#0C1A3D]">{ministry.organization?.church ?? "Não definida"}</p></div>
              <div><p className="text-xs text-slate-400">Distrito</p><p className="mt-1 font-semibold text-[#0C1A3D]">{ministry.organization?.district ?? "Não definido"}</p></div>
              <div><p className="text-xs text-slate-400">Conferência</p><p className="mt-1 font-semibold text-[#0C1A3D]">{ministry.organization?.conference ?? "Não definida"}</p></div>
              <div><p className="text-xs text-slate-400">União</p><p className="mt-1 font-semibold text-[#0C1A3D]">{ministry.organization?.union ?? "Não definida"}</p></div>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
              <button type="button" onClick={() => { setEditing((value) => !value); setSaveError(null); setSaveMessage(null); }} className="rounded-xl bg-[#0C1A3D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#182c58]">
                {editing ? "Fechar edição" : "Editar perfil"}
              </button>
              {saveMessage && <p role="status" className="text-sm text-emerald-700">{saveMessage}</p>}
            </div>
          </div>
        </div>
      </Card>

      {editing && (
        <Card>
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9B7A34]">Gestão do conteúdo</p>
            <h2 className="mt-2 text-xl font-semibold text-[#0C1A3D]">Editar perfil ministerial</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">As alterações são guardadas na base de dados e sujeitas às permissões de gestão da organização. A imagem deve ser um URL HTTPS; fotografias autorizadas podem substituir a imagem ilustrativa.</p>
          </div>
          {saveError && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{saveError}</p>}
          <form onSubmit={saveProfile} className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">Nome do ministério
              <input required minLength={2} maxLength={160} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#C8A24A] focus:ring-2 focus:ring-[#C8A24A]/20" />
            </label>
            <label className="block text-sm font-medium text-slate-700">Categoria / código
              <input maxLength={160} value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#C8A24A] focus:ring-2 focus:ring-[#C8A24A]/20" />
            </label>
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">Descrição
              <textarea required maxLength={2000} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#C8A24A] focus:ring-2 focus:ring-[#C8A24A]/20" />
            </label>
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">Missão e propósito
              <textarea maxLength={2000} rows={3} value={form.philosophy} onChange={(event) => setForm({ ...form, philosophy: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#C8A24A] focus:ring-2 focus:ring-[#C8A24A]/20" />
            </label>
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">URL HTTPS da fotografia de capa
              <input type="url" value={form.coverImageUrl} onChange={(event) => setForm({ ...form, coverImageUrl: event.target.value })} placeholder="https://…" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#C8A24A] focus:ring-2 focus:ring-[#C8A24A]/20" />
            </label>
            <label className="block text-sm font-medium text-slate-700">Faixa etária / público
              <input maxLength={120} value={form.ageRange} onChange={(event) => setForm({ ...form, ageRange: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#C8A24A] focus:ring-2 focus:ring-[#C8A24A]/20" />
            </label>
            <label className="block text-sm font-medium text-slate-700">URL da referência oficial
              <input type="url" value={form.officialUrl} onChange={(event) => setForm({ ...form, officialUrl: event.target.value })} placeholder="https://…" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#C8A24A] focus:ring-2 focus:ring-[#C8A24A]/20" />
            </label>
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">Áreas de atuação
              <textarea rows={4} value={form.focusAreas} onChange={(event) => setForm({ ...form, focusAreas: event.target.value })} placeholder={"Uma área por linha"} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#C8A24A] focus:ring-2 focus:ring-[#C8A24A]/20" />
            </label>
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">Nome da referência
              <input maxLength={200} value={form.sourceLabel} onChange={(event) => setForm({ ...form, sourceLabel: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#C8A24A] focus:ring-2 focus:ring-[#C8A24A]/20" />
            </label>
            <div className="flex flex-wrap items-center gap-3 md:col-span-2">
              <button type="submit" disabled={saving || !form.name.trim() || !form.description.trim()} className="rounded-xl bg-[#0C1A3D] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#182c58] disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? "A guardar…" : "Guardar alterações"}
              </button>
              <button type="button" onClick={() => setForm(formFromMinistry(ministry))} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-50">Repor valores</button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Membros" value={String(ministry.metrics?.members ?? 0)} description="Comunidade" />
        <StatCard label="Líderes" value={String(ministry.metrics?.leaders ?? 0)} description="Equipa" />
        <StatCard label="Programas" value={String(ministry.metrics?.programs ?? ministry.programs?.length ?? 0)} description="Activos" />
        <StatCard label="Participação" value={participation == null ? "—" : `${participation}%`} description={participation == null ? "Sem dados de presença" : "Envolvimento registado"} />
        <StatCard label="Crescimento" value={growth == null ? "—" : `${growth}%`} description={growth == null ? "Sem histórico comparável" : "Evolução registada"} />
        <StatCard label="Impacto" value={impact == null ? "—" : `${impact}%`} description={impact == null ? "Sem resultados registados" : "Resultado medido"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-[#0C1A3D]">Dirigentes</h2>
          <div className="mt-5 space-y-4">
            {ministry.leadership?.length ? ministry.leadership.map((leader) => (
              <div key={leader.id} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <div><p className="font-medium text-[#0C1A3D]">{leader.name}</p><p className="text-sm text-slate-500">{leader.role}</p></div>
                {leader.verified && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Verificado</span>}
              </div>
            )) : <p className="text-sm text-slate-500">Nenhuma liderança registada.</p>}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-[#0C1A3D]">Programas e atividades</h2>
          <div className="mt-5 space-y-4">
            {ministry.programs?.length ? ministry.programs.map((program) => (
              <div key={program.id} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                <div><p className="font-medium text-[#0C1A3D]">{program.name}</p>{program.description && <p className="mt-1 text-sm text-slate-500">{program.description}</p>}</div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{program.status}</span>
              </div>
            )) : <p className="text-sm text-slate-500">Nenhum programa registado.</p>}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-[#0C1A3D]">Relatórios</h2>
        <div className="mt-4 space-y-3">
          {ministry.reports?.length ? ministry.reports.map((report) => (
            <div key={report.id} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <span className="text-sm text-[#0C1A3D]">{report.title}</span>
              <span className="text-xs text-slate-500">{report.status}</span>
            </div>
          )) : <p className="text-sm text-slate-500">Nenhum relatório disponível.</p>}
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9B7A34]">Leitura operacional</p>
            <h2 className="mt-1 text-lg font-semibold text-[#0C1A3D]">ZION Insights</h2>
          </div>
          <span className="text-xs text-slate-400">Calculado a partir dos registos disponíveis</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Programas activos</p>
            <p className="mt-2 text-2xl font-semibold text-[#0C1A3D]">{activeProgramCount}</p>
            <p className="mt-1 text-sm text-slate-500">De {programs.length} programa(s) registado(s)</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Programas planeados</p>
            <p className="mt-2 text-2xl font-semibold text-[#0C1A3D]">{plannedProgramCount}</p>
            <p className="mt-1 text-sm text-slate-500">Aguardam execução</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Relatórios pendentes</p>
            <p className="mt-2 text-2xl font-semibold text-[#0C1A3D]">{pendingReportCount}</p>
            <p className="mt-1 text-sm text-slate-500">Precisam de acompanhamento</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Liderança registada</p>
            <p className="mt-2 text-2xl font-semibold text-[#0C1A3D]">{ministry.leadership?.length ?? 0}</p>
            <p className="mt-1 text-sm text-slate-500">{(ministry.leadership?.length ?? 0) === 0 ? "Associe dirigentes para clarificar responsabilidades." : "Dirigente(s) associado(s) ao ministério"}</p>
          </div>
        </div>
        {(ministry.metrics?.members ?? 0) > 0 && (ministry.leadership?.length ?? 0) === 0 && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Existem membros registados, mas ainda não há dirigentes associados a este ministério.
          </p>
        )}
        <p className="mt-4 text-sm leading-6 text-slate-500">
          Participação, crescimento e impacto aparecem como “—” enquanto não existirem registos de presenças, histórico de membros e resultados de actividades suficientes para calcular esses indicadores com rigor.
        </p>
      </Card>
    </div>
  );
}
