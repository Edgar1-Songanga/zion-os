"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resaRequest } from "@/lib/resa/api";
import { playNotificationAlert, unlockNotificationAudio, type NotificationAlertPreferences } from "@/lib/notifications/notification-alerts";

type Preferences = NotificationAlertPreferences & { channels?: string[] };
type AlertMode = "both" | "sound" | "vibration" | "silent";

const DEFAULTS: Preferences = { enabled: true, sound_enabled: true, vibration_enabled: true, muted_types: [], quiet_start: null, quiet_end: null };
const PUSH_PUBLIC_KEY = process.env.NEXT_PUBLIC_RESA_VAPID_PUBLIC_KEY || "BEmbs-5tKPOjip3OfVkjD4VynTnbOTxGQkXohOT_3KTCF-vCRJzbpLrJubl1y6CowFavkTDf1gSIJdXqNK2CJP8";

function modeFromPreferences(prefs: Preferences): AlertMode {
  if (prefs.sound_enabled !== false && prefs.vibration_enabled !== false) return "both";
  if (prefs.sound_enabled !== false) return "sound";
  if (prefs.vibration_enabled !== false) return "vibration";
  return "silent";
}
function decodeVapidPublicKey(value: string): Uint8Array {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const raw = window.atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export default function NotificationSettingsPage() {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULTS);
  const [mode, setMode] = useState<AlertMode>("both");
  const [quietStart, setQuietStart] = useState("");
  const [quietEnd, setQuietEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushMessage, setPushMessage] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void resaRequest<Preferences>("/v1/notifications/preferences").then((saved) => {
      if (!active) return;
      const next = { ...DEFAULTS, ...saved };
      setPreferences(next);
      setMode(modeFromPreferences(next));
      setQuietStart(next.quiet_start ?? "");
      setQuietEnd(next.quiet_end ?? "");
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Não foi possível carregar as definições.");
    }).finally(() => { if (active) setLoading(false); });
    if ("serviceWorker" in navigator && "PushManager" in window) {
      void navigator.serviceWorker.getRegistration("/sw.js").then((registration) => registration?.pushManager.getSubscription())
        .then((subscription) => { if (active) setPushEnabled(Boolean(subscription)); }).catch(() => { if (active) setPushEnabled(false); });
    }
    return () => { active = false; };
  }, []);

  const previewPreferences = useMemo<Preferences>(() => ({
    ...preferences, enabled: true,
    sound_enabled: mode === "both" || mode === "sound",
    vibration_enabled: mode === "both" || mode === "vibration",
    quiet_start: quietStart || null, quiet_end: quietEnd || null,
  }), [preferences, mode, quietStart, quietEnd]);

  async function save() {
    if (saving) return;
    if (Boolean(quietStart) !== Boolean(quietEnd)) {
      setError("Preencha as duas horas do período silencioso ou deixe ambas vazias.");
      return;
    }
    setSaving(true); setError(""); setMessage("");
    const patch = {
      enabled: true,
      sound_enabled: previewPreferences.sound_enabled,
      vibration_enabled: previewPreferences.vibration_enabled,
      quiet_start: quietStart || null,
      quiet_end: quietEnd || null,
    };
    try {
      const saved = await resaRequest<Preferences>("/v1/notifications/preferences", { method: "PATCH", body: JSON.stringify(patch) });
      const next = { ...preferences, ...patch, ...saved };
      setPreferences(next); setMode(modeFromPreferences(next));
      window.dispatchEvent(new CustomEvent<NotificationAlertPreferences>("zion:notification-preferences-updated", { detail: next }));
      setMessage("As preferências foram guardadas.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível guardar as definições.");
    } finally { setSaving(false); }
  }

  function testAlert() {
    unlockNotificationAudio();
    playNotificationAlert("notification.test", previewPreferences);
    setMessage("Alerta de teste enviado. O navegador ou dispositivo pode limitar som e vibração.");
    setError("");
  }

  async function togglePush() {
    if (pushBusy) return;
    setPushBusy(true); setPushMessage(""); unlockNotificationAudio();
    try {
      if (!PUSH_PUBLIC_KEY) throw new Error("A configuração segura de Web Push ainda não foi concluída.");
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        throw new Error("Este navegador não suporta Web Push. Em alguns telemóveis, instale o RESA como aplicação.");
      }
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Inicie sessão para configurar as notificações.");
      const registration = await navigator.serviceWorker.register("/sw.js");
      if (pushEnabled) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const endpoint = subscription.endpoint;
          await subscription.unsubscribe();
          const { error: deleteError } = await supabase.from("resa_push_subscriptions").delete().eq("user_id", authData.user.id).eq("endpoint", endpoint);
          if (deleteError) throw deleteError;
        }
        setPushEnabled(false); setPushMessage("Web Push desativado neste dispositivo."); return;
      }
      let permission = Notification.permission;
      if (permission === "default") permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Permita notificações nas definições do navegador para continuar.");
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidPublicKey(PUSH_PUBLIC_KEY) as BufferSource });
      const serialized = subscription.toJSON();
      const p256dh = serialized.keys?.p256dh;
      const auth = serialized.keys?.auth;
      if (!p256dh || !auth) { await subscription.unsubscribe(); throw new Error("O navegador não devolveu as chaves necessárias para o push."); }
      const { error: upsertError } = await supabase.from("resa_push_subscriptions").upsert({
        user_id: authData.user.id, endpoint: subscription.endpoint, p256dh, auth_secret: auth,
        expiration_time: subscription.expirationTime, user_agent: navigator.userAgent.slice(0, 500), updated_at: new Date().toISOString(),
      }, { onConflict: "endpoint" });
      if (upsertError) { await subscription.unsubscribe(); throw upsertError; }
      setPushEnabled(true); setPushMessage("Web Push ativado neste dispositivo.");
    } catch (cause) {
      setPushMessage(cause instanceof Error ? cause.message : "Não foi possível configurar o Web Push.");
    } finally { setPushBusy(false); }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B18A35]">ZION OS · Personalização</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#0B2D4D]">Definições de notificações</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Escolha como o ZION OS deve chamar a sua atenção. Os alertas são breves, claros e terminam automaticamente — sem tocar em ciclo contínuo.</p>
      </div>
      {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">A carregar preferências…</div> : (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-base font-semibold text-[#0B2D4D]">Estilo de alerta</h2>
            <p className="mt-1 text-sm text-slate-500">Aplique a preferência a notificações e chamadas recebidas.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {([
                ["both", "Som + vibração", "Toque nítido e vibração curta."],
                ["sound", "Só som", "Melodia curta e audível, sem vibração."],
                ["vibration", "Só vibração", "Sem som; apenas vibração, quando suportada."],
                ["silent", "Silencioso", "Sem som e sem vibração; os avisos continuam na aplicação."],
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
              <p className="text-xs leading-5 text-slate-500">O teste é breve. O navegador pode exigir interação e permissões prévias.</p>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-base font-semibold text-[#0B2D4D]">Período silencioso</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Opcional. Durante este intervalo, não são emitidos som nem vibração. Deixe ambos vazios para manter os alertas sempre disponíveis.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Começa às<input type="time" value={quietStart} onChange={(event) => setQuietStart(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#C8A24A] focus:ring-2 focus:ring-[#C8A24A]/20" /></label>
              <label className="text-sm font-medium text-slate-700">Termina às<input type="time" value={quietEnd} onChange={(event) => setQuietEnd(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#C8A24A] focus:ring-2 focus:ring-[#C8A24A]/20" /></label>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div><h2 className="text-base font-semibold text-[#0B2D4D]">Alertas em segundo plano</h2><p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">Configure o Web Push para receber avisos quando o RESA não estiver aberto. A entrega e o som dependem do navegador, sistema operativo e permissões do dispositivo.</p></div>
              <button type="button" onClick={() => void togglePush()} disabled={pushBusy} className="shrink-0 rounded-xl bg-[#0B2D4D] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123D63] disabled:opacity-50">{pushBusy ? "A configurar…" : pushEnabled ? "Desativar Web Push" : "Ativar Web Push"}</button>
            </div>
            {pushMessage && <p role="status" className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">{pushMessage}</p>}
          </section>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
          <div className="flex justify-end"><button type="button" onClick={() => void save()} disabled={saving} className="rounded-xl bg-[#0B2D4D] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123D63] disabled:cursor-not-allowed disabled:opacity-50">{saving ? "A guardar…" : "Guardar preferências"}</button></div>
        </div>
      )}
    </main>
  );
}
