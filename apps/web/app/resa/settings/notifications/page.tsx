"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Preferences = {
  enabled: boolean;
  channels: string[];
  muted_types: string[];
  quiet_start: string | null;
  quiet_end: string | null;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  sound_style: "soft" | "chime" | "classic" | "silent";
};

const defaults: Preferences = {
  enabled: true,
  channels: ["in_app"],
  muted_types: [],
  quiet_start: null,
  quiet_end: null,
  sound_enabled: true,
  vibration_enabled: true,
  sound_style: "soft",
};

const notificationTypes = [
  { value: "resa.follow", label: "Novos seguidores", detail: "Quando alguém começa a seguir o teu perfil." },
  { value: "resa.comment", label: "Comentários", detail: "Quando alguém comenta as tuas publicações." },
  { value: "resa.reaction", label: "Reações", detail: "Quando alguém reage às tuas publicações." },
  { value: "resa.share", label: "Partilhas", detail: "Quando alguém partilha as tuas publicações." },
  { value: "resa.call.audio", label: "Chamadas de áudio", detail: "Alertas de chamadas de áudio recebidas." },
  { value: "resa.call.video", label: "Videochamadas", detail: "Alertas de videochamadas recebidas." },
];

export default function ResaNotificationSettingsPage() {
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    resaRequest<Partial<Preferences>>("/v1/notifications/preferences")
      .then((result) => setPreferences((current) => ({
        ...current,
        ...result,
        channels: result.channels ?? current.channels,
        muted_types: result.muted_types ?? [],
        quiet_start: result.quiet_start?.slice(0, 5) ?? null,
        quiet_end: result.quiet_end?.slice(0, 5) ?? null,
      })))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Não foi possível carregar as preferências."))
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPreferences((current) => ({ ...current, [key]: value }));
    setNotice("");
  }

  function toggleType(type: string, checked: boolean) {
    const next = new Set(preferences.muted_types);
    if (checked) next.add(type);
    else next.delete(type);
    update("muted_types", [...next]);
  }

  async function save() {
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const saved = await resaRequest<Preferences>("/v1/notifications/preferences", {
        method: "PATCH",
        body: JSON.stringify({
          enabled: preferences.enabled,
          muted_types: preferences.muted_types,
          quiet_start: preferences.quiet_start || null,
          quiet_end: preferences.quiet_end || null,
          sound_enabled: preferences.sound_enabled,
          vibration_enabled: preferences.vibration_enabled,
        }),
      });
      setPreferences((current) => ({ ...current, ...saved }));
      setNotice("As preferências de notificações foram guardadas.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível guardar as preferências.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--zion-light)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="rounded-3xl bg-[var(--zion-primary)] p-6 text-white shadow-[var(--zion-shadow-lg)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">RESA · CONTA</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Preferências de notificações</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">Controla os alertas, os tipos de atividade e os períodos em que preferes não ser interrompido.</p>
        </header>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}

        {loading ? <section className="rounded-2xl border border-[var(--zion-border)] bg-white p-6 text-sm text-[var(--zion-muted)]">A carregar preferências…</section> : (
          <>
            <section className="rounded-2xl border border-[var(--zion-border)] bg-white p-5 shadow-[var(--zion-shadow-sm)] sm:p-6">
              <h2 className="text-base font-semibold text-[var(--zion-dark)]">Atividade e alertas</h2>
              <label className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-[var(--zion-border)] p-4">
                <span><span className="block text-sm font-semibold text-[var(--zion-dark)]">Notificações ativadas</span><span className="mt-1 block text-xs leading-5 text-[var(--zion-muted)]">Quando desativadas, o RESA deixa de criar novas notificações para a tua conta e não envia alertas push.</span></span>
                <input type="checkbox" checked={preferences.enabled} onChange={(event) => update("enabled", event.target.checked)} className="mt-1 h-5 w-5 accent-[var(--zion-primary)]" />
              </label>
              <div className="mt-5 space-y-3">
                <p className="text-sm font-semibold text-[var(--zion-dark)]">Tipos de atividade que queres silenciar</p>
                {notificationTypes.map((item) => (
                  <label key={item.value} className="flex items-start justify-between gap-4 rounded-xl border border-[var(--zion-border)] p-4">
                    <span><span className="block text-sm font-medium text-[var(--zion-dark)]">{item.label}</span><span className="mt-1 block text-xs leading-5 text-[var(--zion-muted)]">{item.detail}</span></span>
                    <input type="checkbox" checked={preferences.muted_types.includes(item.value)} onChange={(event) => toggleType(item.value, event.target.checked)} className="mt-1 h-5 w-5 accent-[var(--zion-primary)]" />
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--zion-border)] bg-white p-5 shadow-[var(--zion-shadow-sm)] sm:p-6">
              <h2 className="text-base font-semibold text-[var(--zion-dark)]">Som e vibração</h2>
              <div className="mt-4 space-y-3">
                <label className="flex items-center justify-between gap-4 rounded-xl border border-[var(--zion-border)] p-4">
                  <span className="text-sm font-medium text-[var(--zion-dark)]">Reproduzir sons de alerta</span>
                  <input type="checkbox" checked={preferences.sound_enabled} onChange={(event) => update("sound_enabled", event.target.checked)} className="h-5 w-5 accent-[var(--zion-primary)]" />
                </label>
                <label className="flex items-center justify-between gap-4 rounded-xl border border-[var(--zion-border)] p-4">
                  <span className="text-sm font-medium text-[var(--zion-dark)]">Vibrar em dispositivos compatíveis</span>
                  <input type="checkbox" checked={preferences.vibration_enabled} onChange={(event) => update("vibration_enabled", event.target.checked)} className="h-5 w-5 accent-[var(--zion-primary)]" />
                </label>
                <div className="rounded-xl border border-[var(--zion-border)] p-4">
                  <label htmlFor="quiet-start" className="block text-sm font-semibold text-[var(--zion-dark)]">Início do período silencioso</label>
                  <input id="quiet-start" type="time" value={preferences.quiet_start ?? ""} onChange={(event) => update("quiet_start", event.target.value || null)} className="mt-2 rounded-lg border border-[var(--zion-border)] bg-white px-3 py-2 text-sm text-[var(--zion-dark)]" />
                  <label htmlFor="quiet-end" className="mt-4 block text-sm font-semibold text-[var(--zion-dark)]">Fim do período silencioso</label>
                  <input id="quiet-end" type="time" value={preferences.quiet_end ?? ""} onChange={(event) => update("quiet_end", event.target.value || null)} className="mt-2 rounded-lg border border-[var(--zion-border)] bg-white px-3 py-2 text-sm text-[var(--zion-dark)]" />
                  <p className="mt-3 text-xs leading-5 text-[var(--zion-muted)]">Durante este período, o RESA mantém as notificações na caixa de entrada, mas não reproduz sons nem envia alertas push não críticos. A hora é calculada pelo fuso horário configurado no teu perfil.</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--zion-border)] bg-white p-5 shadow-[var(--zion-shadow-sm)] sm:p-6">
              <h2 className="text-base font-semibold text-[var(--zion-dark)]">Notificações push</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--zion-muted)]">A ativação é feita por dispositivo no sino de notificações. O navegador tem de conceder permissão e o dispositivo tem de possuir uma subscrição válida.</p>
            </section>

            <section className="rounded-2xl border border-[var(--zion-border)] bg-white p-5 shadow-[var(--zion-shadow-sm)] sm:p-6">
              <h2 className="text-base font-semibold text-[var(--zion-dark)]">Transparência e segurança</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--zion-muted)]">Consulta as denúncias que apresentaste e acompanha as decisões da equipa de moderação.</p>
              <Link href="/resa/my-reports" className="mt-4 inline-flex rounded-xl border border-[var(--zion-border)] px-4 py-2 text-sm font-semibold text-[var(--zion-dark)]">As minhas denúncias</Link>
              <Link href="/resa/my-actions" className="ml-2 mt-4 inline-flex rounded-xl border border-[var(--zion-border)] px-4 py-2 text-sm font-semibold text-[var(--zion-dark)]">Medidas aplicadas à minha conta</Link>
              <Link href="/resa/my-account-sanctions" className="ml-2 mt-4 inline-flex rounded-xl border border-[var(--zion-border)] px-4 py-2 text-sm font-semibold text-[var(--zion-dark)]">Restrições da minha conta</Link>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href="/resa" className="rounded-xl border border-[var(--zion-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--zion-dark)]">Voltar ao RESA</Link>
              <button type="button" onClick={() => void save()} disabled={saving} className="rounded-xl bg-[var(--zion-primary)] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "A guardar…" : "Guardar preferências"}</button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
