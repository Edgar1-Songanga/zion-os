"use client";

import { useEffect, useMemo, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import { playNotificationAlert, unlockNotificationAudio, type NotificationAlertPreferences } from "@/lib/notifications/notification-alerts";

type Preferences = NotificationAlertPreferences & { channels?: string[] };
type AlertMode = "both" | "sound" | "vibration" | "silent";

const DEFAULTS: Preferences = {
  enabled: true,
  sound_enabled: true,
  vibration_enabled: true,
  muted_types: [],
  quiet_start: null,
  quiet_end: null,
};

function modeFromPreferences(prefs: Preferences): AlertMode {
  if (prefs.sound_enabled !== false && prefs.vibration_enabled !== false) return "both";
  if (prefs.sound_enabled !== false) return "sound";
  if (prefs.vibration_enabled !== false) return "vibration";
  return "silent";
}

export default function NotificationSettingsPage() {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULTS);
  const [mode, setMode] = useState<AlertMode>("both");
  const [quietStart, setQuietStart] = useState("");
  const [quietEnd, setQuietEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void resaRequest<Preferences>("/v1/notifications/preferences")
      .then((saved) => {
        if (!active) return;
        const next = { ...DEFAULTS, ...saved };
        setPreferences(next);
        setMode(modeFromPreferences(next));
        setQuietStart(next.quiet_start ?? "");
        setQuietEnd(next.quiet_end ?? "");
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Não foi possível carregar as definições."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const previewPreferences = useMemo<Preferences>(() => ({
    ...preferences,
    enabled: true,
    sound_enabled: mode === "both" || mode === "sound",
    vibration_enabled: mode === "both" || mode === "vibration",
    quiet_start: quietStart || null,
    quiet_end: quietEnd || null,
  }), [preferences, mode, quietStart, quietEnd]);

  async function save() {
    if (saving) return;
    if (Boolean(quietStart) !== Boolean(quietEnd)) {
      setError("Preencha as duas horas do período silencioso ou deixe ambas vazias.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    const patch = {
      enabled: true,
      sound_enabled: previewPreferences.sound_enabled,
      vibration_enabled: previewPreferences.vibration_enabled,
      quiet_start: quietStart || null,
      quiet_end: quietEnd || null,
    };
    try {
      const saved = await resaRequest<Preferences>("/v1/notifications/preferences", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      const next = { ...preferences, ...patch, ...saved };
      setPreferences(next);
      setMode(modeFromPreferences(next));
      setMessage("As preferências foram guardadas.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível guardar as definições.");
    } finally {
      setSaving(false);
    }
  }

  function testAlert() {
    unlockNotificationAudio();
    playNotificationAlert("notification.test", previewPreferences);
    setMessage("Alerta de teste enviado. O navegador ou dispositivo pode limitar som e vibração.");
    setError("");
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B18A35]">ZION OS · Personalização</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#0B2D4D]">Definições de notificações</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Escolha como o ZION OS deve chamar a sua atenção. Os alertas sonoros são curtos e terminam automaticamente, sem tocar em ciclo contínuo.</p>
      </div>

      {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">A carregar preferências…</div> : (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-base font-semibold text-[#0B2D4D]">Estilo de alerta</h2>
            <p className="mt-1 text-sm text-slate-500">Aplique a mesma preferência a notificações e chamadas recebidas.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {([
                ["both", "Som + vibração", "Alerta sonoro nítido acompanhado de uma vibração curta."],
                ["sound", "Só som", "Um toque elegante e audível, sem vibração."],
                ["vibration", "Só vibração", "Sem som; apenas vibração, quando suportada."],
                ["silent", "Silencioso", "Sem som e sem vibração; as notificações continuam na aplicação."],
              ] as const).map(([value, title, description]) => (
                <button key={value} type="button" aria-pressed={mode === value} onClick={() => { setMode(value); setMessage(""); }}
                  className={`rounded-xl border p-4 text-left transition ${mode === value ? "border-[#C8A24A] bg-amber-50/60 ring-2 ring-[#C8A24A]/20" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
                  <span className="flex items-center justify-between gap-3 text-sm font-semibold text-[#0B2D4D]">{title}<span className={`h-4 w-4 rounded-full border ${mode === value ? "border-[#0B2D4D] bg-[#0B2D4D] ring-2 ring-white ring-offset-1 ring-offset-[#0B2D4D]" : "border-slate-300"}`} /></span>
                  <span className="mt-2 block text-xs leading-5 text-slate-500">{description}</span>
                </button>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="button" onClick={testAlert} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#0B2D4D] transition hover:bg-slate-50">Testar alerta</button>
              <p className="text-xs leading-5 text-slate-500">O som de teste é breve. O navegador pode exigir interação e permissões prévias.</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-base font-semibold text-[#0B2D4D]">Período silencioso</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Opcional. Durante este intervalo, não são emitidos som nem vibração. Deixe os campos vazios para manter os alertas sempre disponíveis.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Começa às<input type="time" value={quietStart} onChange={(event) => setQuietStart(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#C8A24A] focus:ring-2 focus:ring-[#C8A24A]/20" /></label>
              <label className="text-sm font-medium text-slate-700">Termina às<input type="time" value={quietEnd} onChange={(event) => setQuietEnd(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#C8A24A] focus:ring-2 focus:ring-[#C8A24A]/20" /></label>
            </div>
          </section>

          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
          <div className="flex justify-end"><button type="button" onClick={() => void save()} disabled={saving} className="rounded-xl bg-[#0B2D4D] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123D63] disabled:cursor-not-allowed disabled:opacity-50">{saving ? "A guardar…" : "Guardar preferências"}</button></div>
        </div>
      )}
    </main>
  );
}
