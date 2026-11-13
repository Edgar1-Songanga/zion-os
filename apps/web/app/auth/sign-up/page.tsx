"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Method = "phone" | "email";
function normalizePhone(value: string) {
  const compact = value.trim().replace(/[\s().-]/g, "");
  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("00")) return "+" + compact.slice(2);
  if (compact.startsWith("244")) return "+" + compact;
  return "+244" + compact;
}

export default function SignUpPage() {
  const supabase = createClient();
  const [method, setMethod] = useState<Method>("phone");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [awaitingPhone, setAwaitingPhone] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setLoading(true);
    if (method === "phone") {
      const normalized = normalizePhone(phone);
      if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
        setError("Introduza um número válido. Para Angola, escreva os 9 dígitos; acrescentamos +244.");
        setLoading(false); return;
      }
      const { data, error: signupError } = await supabase.auth.signUp({
        phone: normalized, password, options: { channel: "sms" },
      });
      if (signupError) setError(signupError.message);
      else if (data.session) { window.location.replace("/dashboard"); return; }
      else {
        setPhone(normalized); setAwaitingPhone(true);
        setMessage("Introduza o código SMS enviado para " + normalized + " para ativar a conta.");
      }
      setLoading(false); return;
    }
    const { error: signupError } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin + "/auth/callback?next=/dashboard" },
    });
    if (signupError) setError(signupError.message);
    else setMessage("Conta criada. Verifique o seu email para concluir a ativação.");
    setLoading(false);
  }

  async function confirmPhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({ phone: normalizePhone(phone), token: otp, type: "sms" });
    if (verifyError) { setError(verifyError.message); setLoading(false); return; }
    window.location.replace("/dashboard");
  }

  async function resendCode() {
    setError(""); setMessage(""); setLoading(true);
    const { error: resendError } = await supabase.auth.resend({ type: "sms", phone: normalizePhone(phone) });
    if (resendError) setError(resendError.message);
    else setMessage("Novo código solicitado. Verifique as mensagens SMS.");
    setLoading(false);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--zion-light)] px-6 py-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(200,162,74,0.14),transparent_35%),linear-gradient(135deg,rgba(11,45,77,0.06),transparent_55%)]" />
      <section className="relative w-full max-w-md rounded-3xl border border-[var(--zion-border)] bg-white p-8 shadow-[var(--zion-shadow-lg)] sm:p-9">
        <div className="mb-8 h-1 w-12 rounded-full bg-[var(--zion-gold)]" />
        <p className="text-sm font-semibold tracking-[0.22em] text-[var(--zion-muted)]">ZION OS</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--zion-dark)]">Criar conta</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--zion-muted)]">Crie o seu acesso inicial ao ZION OS.</p>
        {!awaitingPhone ? <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="grid grid-cols-2 rounded-xl bg-[var(--zion-light)] p-1" role="group" aria-label="Método de registo">
            <button type="button" onClick={() => { setMethod("phone"); setError(""); setMessage(""); }} aria-pressed={method === "phone"} className={method === "phone" ? "rounded-lg bg-white px-3 py-2 text-sm font-semibold text-[var(--zion-primary)] shadow-sm" : "rounded-lg px-3 py-2 text-sm text-[var(--zion-muted)]"}>Telefone</button>
            <button type="button" onClick={() => { setMethod("email"); setError(""); setMessage(""); }} aria-pressed={method === "email"} className={method === "email" ? "rounded-lg bg-white px-3 py-2 text-sm font-semibold text-[var(--zion-primary)] shadow-sm" : "rounded-lg px-3 py-2 text-sm text-[var(--zion-muted)]"}>Email</button>
          </div>
          {method === "phone" ? <label className="block">
            <span className="text-sm font-medium text-[var(--zion-dark)]">Número de telefone</span>
            <input type="tel" required autoComplete="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="923 000 000 ou +244 923 000 000" className="mt-2 w-full rounded-xl border border-[var(--zion-border)] px-4 py-3 outline-none focus:border-[var(--zion-sky)] focus:ring-4 focus:ring-[var(--zion-sky)]/10" />
            <span className="mt-1 block text-xs text-[var(--zion-muted)]">Para números angolanos, pode escrever apenas os 9 dígitos.</span>
          </label> : <label className="block">
            <span className="text-sm font-medium text-[var(--zion-dark)]">Email</span>
            <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--zion-border)] px-4 py-3 outline-none focus:border-[var(--zion-sky)] focus:ring-4 focus:ring-[var(--zion-sky)]/10" />
          </label>}
          <label className="block">
            <span className="text-sm font-medium text-[var(--zion-dark)]">Palavra-passe</span>
            <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--zion-border)] px-4 py-3 outline-none focus:border-[var(--zion-sky)] focus:ring-4 focus:ring-[var(--zion-sky)]/10" />
          </label>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-[var(--zion-primary)] px-4 py-3 font-semibold text-white shadow-sm hover:bg-[var(--zion-primary-deep)] disabled:opacity-60">{loading ? "A criar..." : "Criar conta"}</button>
        </form> : <form onSubmit={confirmPhone} className="mt-8 space-y-5">
          <div className="rounded-xl border border-[var(--zion-border)] bg-[var(--zion-light)] p-4">
            <p className="font-semibold text-[var(--zion-dark)]">Confirmar número</p>
            <p className="mt-1 text-sm text-[var(--zion-muted)]">Introduza o código de 6 dígitos enviado para {phone}.</p>
          </div>
          <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Código de 6 dígitos" className="w-full rounded-xl border border-[var(--zion-border)] px-4 py-3 text-center tracking-[0.3em]" />
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
          <button type="submit" disabled={loading || otp.length !== 6} className="w-full rounded-xl bg-[var(--zion-primary)] px-4 py-3 font-semibold text-white disabled:opacity-60">{loading ? "A verificar..." : "Confirmar e ativar conta"}</button>
          <button type="button" onClick={() => void resendCode()} disabled={loading} className="w-full rounded-xl border border-[var(--zion-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--zion-dark)]">Reenviar código</button>
          <button type="button" onClick={() => { setAwaitingPhone(false); setOtp(""); setError(""); setMessage(""); }} className="w-full text-sm text-[var(--zion-muted)] underline">Alterar número</button>
        </form>}
        <p className="mt-6 text-sm text-[var(--zion-muted)]">Já tem conta? <Link href="/auth/sign-in" className="font-semibold text-[var(--zion-primary)] underline underline-offset-4">Entrar</Link></p>
        <p className="mt-3 text-sm text-[var(--zion-muted)]">Representa uma igreja? <Link href="/church-registration" className="font-semibold text-[var(--zion-primary)] underline underline-offset-4">Registar igreja</Link></p>
      </section>
    </main>
  );
}
