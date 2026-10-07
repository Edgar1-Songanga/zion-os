"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resaRequest } from "@/lib/resa/api";

type TotpFactor = {
  id: string;
  friendly_name?: string | null;
  status: "verified" | "unverified" | string;
};

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mfaLoading, setMfaLoading] = useState(true);
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaFactor, setMfaFactor] = useState<TotpFactor | null>(null);
  const [mfaQr, setMfaQr] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [privacy, setPrivacy] = useState({ profile_visibility: "community", bio_visibility: "community", country_visibility: "community", timezone_visibility: "private" });

  const loadMfa = async () => {
    setMfaLoading(true);
    const supabase = createClient();
    const { data, error: factorError } = await supabase.auth.mfa.listFactors();
    if (factorError) {
      setError(factorError.message);
      setMfaLoading(false);
      return;
    }
    const verified = (data.totp ?? []).find((factor) => factor.status === "verified") as TotpFactor | undefined;
    setMfaFactor(verified ?? null);
    setMfaLoading(false);
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data, error: userError }) => {
      if (userError) setError(userError.message);
      else setEmail(data.user?.email ?? "");
      setLoading(false);
    });
    void loadMfa();
    resaRequest<{ privacy?: typeof privacy }>("/v1/identity/profile").then((p) => { if (p.privacy) setPrivacy((x) => ({ ...x, ...p.privacy })); }).catch(() => undefined);
  }, []);

  async function updateEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage("");
    if (!newEmail.trim() || newEmail.trim().toLowerCase() === email.toLowerCase()) {
      setError("Introduza um novo email diferente do atual.");
      return;
    }
    setSavingEmail(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (updateError) setError(updateError.message);
    else {
      setMessage("Pedido de alteração enviado. Confirme o novo endereço através do email recebido.");
      setNewEmail("");
    }
    setSavingEmail(false);
  }

  async function updatePrivacy() {
    setError(""); setMessage(""); setMfaBusy(true);
    try { await resaRequest("/v1/identity/profile", { method: "PATCH", body: JSON.stringify({ privacy }) }); setMessage("Preferências de privacidade atualizadas."); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível atualizar a privacidade."); }
    finally { setMfaBusy(false); }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage("");
    if (password.length < 8) {
      setError("A palavra-passe deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As palavras-passe não coincidem.");
      return;
    }
    setSavingPassword(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) setError(updateError.message);
    else {
      setMessage("Palavra-passe atualizada com sucesso.");
      setPassword(""); setConfirmPassword("");
    }
    setSavingPassword(false);
  }

  async function signOutOtherSessions() {
    setError(""); setMessage("");
    if (!window.confirm("Encerrar todas as outras sessões desta conta? O dispositivo atual permanecerá ligado.")) return;
    setMfaBusy(true);
    const supabase = createClient();
    const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
    if (signOutError) setError(signOutError.message);
    else setMessage("Todas as outras sessões foram encerradas. Este dispositivo permanece ligado.");
    setMfaBusy(false);
  }

  async function signOutEverywhere() {
    setError(""); setMessage("");
    if (!window.confirm("Encerrar todas as sessões, incluindo este dispositivo? Será necessário entrar novamente.")) return;
    setMfaBusy(true);
    const supabase = createClient();
    const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
    if (signOutError) {
      setError(signOutError.message);
      setMfaBusy(false);
      return;
    }
    window.location.replace("/auth/sign-in");
  }

  async function beginMfaEnrollment() {
    setError(""); setMessage(""); setMfaBusy(true);
    const supabase = createClient();
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "ZION OS Authenticator",
    });
    if (enrollError) {
      setError(enrollError.message);
      setMfaBusy(false);
      return;
    }
    setMfaQr(data.totp?.qr_code ?? "");
    setMfaSecret(data.totp?.secret ?? "");
    setMfaFactor({ id: data.id, friendly_name: data.friendly_name, status: "unverified" });
    setMfaCode("");
    setMfaBusy(false);
  }

  async function verifyMfaEnrollment() {
    if (!mfaFactor || !mfaCode.trim()) return;
    setError(""); setMessage(""); setMfaBusy(true);
    const supabase = createClient();
    const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactor.id });
    if (challenge.error) {
      setError(challenge.error.message);
      setMfaBusy(false);
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: mfaFactor.id,
      challengeId: challenge.data.id,
      code: mfaCode.trim(),
    });
    if (verifyError) {
      setError(verifyError.message);
      setMfaBusy(false);
      return;
    }
    setMfaQr(""); setMfaSecret(""); setMfaCode("");
    setMessage("Autenticação de dois fatores ativada com sucesso.");
    await loadMfa();
    setMfaBusy(false);
  }

  async function disableMfa() {
    if (!mfaFactor) return;
    if (!window.confirm("Desativar a autenticação de dois fatores nesta conta?")) return;
    setError(""); setMessage(""); setMfaBusy(true);
    const supabase = createClient();
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: mfaFactor.id });
    if (unenrollError) setError(unenrollError.message);
    else {
      await supabase.auth.refreshSession();
      setMessage("Autenticação de dois fatores desativada.");
      setMfaFactor(null);
    }
    setMfaBusy(false);
  }

  if (loading) {
    return <main className="min-h-screen bg-[var(--zion-light)] p-6 lg:p-8"><div className="mx-auto max-w-4xl rounded-2xl border border-[var(--zion-border)] bg-white p-8 text-sm text-[var(--zion-muted)] shadow-[var(--zion-shadow-sm)]">A carregar a conta…</div></main>;
  }

  return (
    <main className="min-h-screen bg-[var(--zion-light)] p-5 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="relative overflow-hidden rounded-3xl bg-[var(--zion-primary)] p-7 text-white shadow-[var(--zion-shadow-lg)] sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(200,162,74,0.25),transparent_42%)]" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">ZION OS</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Conta e segurança</h1>
            <p className="mt-2 text-sm text-white/65">Credenciais e acesso pertencem à conta; informações pessoais pertencem ao perfil.</p>
          </div>
        </header>

        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

        <section className="rounded-2xl border border-[var(--zion-border)] bg-white p-6 shadow-[var(--zion-shadow-sm)] sm:p-7">
          <div className="border-b border-[var(--zion-border)] pb-5"><h2 className="text-xl font-semibold tracking-tight text-[var(--zion-dark)]">Privacidade</h2><p className="mt-1 text-sm text-[var(--zion-muted)]">Defina quem pode ver os seus dados de perfil.</p></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">{([["profile_visibility","Perfil"],["bio_visibility","Biografia"],["country_visibility","País"],["timezone_visibility","Fuso horário"]] as const).map(([key,label]) => <label key={key} className="rounded-xl border border-[var(--zion-border)] bg-[var(--zion-light)] p-4"><span className="block text-sm font-semibold text-[var(--zion-dark)]">{label}</span><select value={privacy[key]} onChange={(e)=>setPrivacy(p=>({...p,[key]:e.target.value}))} className="mt-2 w-full rounded-lg border border-[var(--zion-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--zion-sky)]">{<option value="public">Público</option>}<option value="community">Membros ZION</option><option value="private">Privado</option></select></label>)}</div>
          <button type="button" onClick={updatePrivacy} disabled={mfaBusy} className="mt-5 rounded-xl bg-[var(--zion-primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--zion-primary-deep)] disabled:opacity-50">Guardar privacidade</button>
        </section>

        <section className="rounded-2xl border border-[var(--zion-border)] bg-white p-6 shadow-[var(--zion-shadow-sm)] sm:p-7">
          <div className="border-b border-[var(--zion-border)] pb-5">
            <h2 className="text-xl font-semibold tracking-tight text-[var(--zion-dark)]">Email de acesso</h2>
            <p className="mt-1 text-sm text-[var(--zion-muted)]">Email atual: <span className="font-medium text-[var(--zion-dark)]">{email || "não disponível"}</span></p>
          </div>
          <form onSubmit={updateEmail} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input type="email" required autoComplete="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Novo endereço de email" className="min-w-0 flex-1 rounded-xl border border-[var(--zion-border)] px-4 py-3 outline-none transition focus:border-[var(--zion-sky)] focus:ring-4 focus:ring-[var(--zion-sky)]/10" />
            <button type="submit" disabled={savingEmail} className="rounded-xl bg-[var(--zion-primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--zion-primary-deep)] disabled:opacity-50">{savingEmail ? "A atualizar…" : "Alterar email"}</button>
          </form>
          <p className="mt-3 text-xs text-[var(--zion-muted)]">A confirmação é tratada pelo sistema de autenticação antes da alteração ficar efetiva.</p>
        </section>

        <section className="rounded-2xl border border-[var(--zion-border)] bg-white p-6 shadow-[var(--zion-shadow-sm)] sm:p-7">
          <div className="border-b border-[var(--zion-border)] pb-5">
            <h2 className="text-xl font-semibold tracking-tight text-[var(--zion-dark)]">Palavra-passe</h2>
            <p className="mt-1 text-sm text-[var(--zion-muted)]">Altere a credencial usada para entrar no ZION.</p>
          </div>
          <form onSubmit={updatePassword} className="mt-6 grid gap-4 sm:grid-cols-2">
            <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nova palavra-passe" className="rounded-xl border border-[var(--zion-border)] px-4 py-3 outline-none transition focus:border-[var(--zion-sky)] focus:ring-4 focus:ring-[var(--zion-sky)]/10" />
            <input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmar palavra-passe" className="rounded-xl border border-[var(--zion-border)] px-4 py-3 outline-none transition focus:border-[var(--zion-sky)] focus:ring-4 focus:ring-[var(--zion-sky)]/10" />
            <div className="sm:col-span-2"><button type="submit" disabled={savingPassword} className="rounded-xl bg-[var(--zion-primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--zion-primary-deep)] disabled:opacity-50">{savingPassword ? "A atualizar…" : "Atualizar palavra-passe"}</button></div>
          </form>
        </section>

        <section className="rounded-2xl border border-[var(--zion-border)] bg-white p-6 shadow-[var(--zion-shadow-sm)] sm:p-7">
          <div className="border-b border-[var(--zion-border)] pb-5">
            <h2 className="text-xl font-semibold tracking-tight text-[var(--zion-dark)]">Autenticação de dois fatores (2FA)</h2>
            <p className="mt-1 text-sm text-[var(--zion-muted)]">Proteja a conta com um código temporário de uma aplicação autenticadora.</p>
          </div>
          {mfaLoading ? <p className="mt-5 text-sm text-[var(--zion-muted)]">A verificar o estado da proteção…</p> : mfaFactor?.status === "verified" && !mfaQr ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <div><p className="font-semibold text-emerald-700">2FA ativo</p><p className="mt-1 text-sm text-[var(--zion-muted)]">Fator autenticador verificado nesta conta.</p></div>
              <button type="button" onClick={disableMfa} disabled={mfaBusy} className="rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50">{mfaBusy ? "A processar…" : "Desativar 2FA"}</button>
            </div>
          ) : !mfaQr ? (
            <div className="mt-5"><p className="text-sm text-slate-600">Ainda não existe um autenticador 2FA verificado.</p><button type="button" onClick={beginMfaEnrollment} disabled={mfaBusy} className="mt-4 rounded-xl bg-[var(--zion-primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--zion-primary-deep)] disabled:opacity-50">{mfaBusy ? "A preparar…" : "Ativar 2FA"}</button></div>
          ) : (
            <div className="mt-5 grid gap-6 md:grid-cols-[180px_1fr]">
              <div className="rounded-xl border border-[var(--zion-border)] bg-white p-3"><img src={mfaQr} alt="QR Code para configurar o autenticador" className="h-auto w-full" /></div>
              <div>
                <p className="text-sm text-[var(--zion-muted)]">1. Abra Google Authenticator, Microsoft Authenticator ou outra aplicação compatível e leia o QR Code.</p>
                <p className="mt-2 text-sm text-[var(--zion-muted)]">2. Introduza aqui o código de 6 dígitos apresentado pela aplicação.</p>
                {mfaSecret && <p className="mt-3 break-all rounded-lg bg-[var(--zion-light)] p-3 text-xs text-[var(--zion-muted)]">Chave manual: <span className="font-mono">{mfaSecret}</span></p>}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Código de 6 dígitos" className="rounded-xl border border-[var(--zion-border)] px-4 py-3 outline-none focus:border-[var(--zion-sky)]" />
                  <button type="button" onClick={verifyMfaEnrollment} disabled={mfaBusy || mfaCode.length !== 6} className="rounded-xl bg-[var(--zion-primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--zion-primary-deep)] disabled:opacity-50">{mfaBusy ? "A verificar…" : "Confirmar 2FA"}</button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--zion-border)] bg-white p-6 shadow-[var(--zion-shadow-sm)] sm:p-7">
          <div className="border-b border-[var(--zion-border)] pb-5">
            <h2 className="text-xl font-semibold tracking-tight text-[var(--zion-dark)]">Sessões e dispositivos</h2>
            <p className="mt-1 text-sm text-[var(--zion-muted)]">Controle o acesso da sua conta sem criar um registo paralelo de sessões. O sistema de autenticação gere as sessões diretamente.</p>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--zion-border)] bg-[var(--zion-light)] p-5">
              <p className="font-semibold text-[var(--zion-dark)]">Sessão atual</p>
              <p className="mt-1 text-sm text-[var(--zion-muted)]">Este dispositivo continuará autenticado.</p>
              <button type="button" onClick={signOutOtherSessions} disabled={mfaBusy} className="mt-4 rounded-xl bg-[var(--zion-primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--zion-primary-deep)] disabled:opacity-50">Encerrar outras sessões</button>
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50 p-5">
              <p className="font-semibold text-red-800">Encerrar em todo o lado</p>
              <p className="mt-1 text-sm text-red-700">Revoga as sessões da conta, incluindo esta sessão.</p>
              <button type="button" onClick={signOutEverywhere} disabled={mfaBusy} className="mt-4 rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50">Encerrar todas as sessões</button>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href="/profile" className="rounded-xl border border-[var(--zion-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--zion-dark)] transition hover:border-[var(--zion-sky)] hover:text-[var(--zion-primary)]">Voltar ao perfil</Link>
          <Link href="/auth/forgot-password" className="rounded-xl border border-[var(--zion-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--zion-dark)] transition hover:border-[var(--zion-sky)] hover:text-[var(--zion-primary)]">Recuperar palavra-passe</Link>
        </div>
      </div>
    </main>
  );
}
