"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function SignInForm() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const redirectPath = (() => {
    if (!next) return "/dashboard";
    try {
      const target = new URL(next, window.location.origin);
      return target.origin === window.location.origin && !target.pathname.startsWith("//")
        ? `${target.pathname}${target.search}${target.hash}`
        : "/dashboard";
    } catch {
      return "/dashboard";
    }
  })();
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsMfa, setNeedsMfa] = useState(false);
  const [factorId, setFactorId] = useState("");
  const [challengeId, setChallengeId] = useState("");

  function normalizePhone(value: string) {
    const compact = value.trim().replace(/[\s().-]/g, "");
    if (compact.startsWith("+")) return compact;
    if (compact.startsWith("00")) return "+" + compact.slice(2);
    if (compact.startsWith("244")) return "+" + compact;
    return "+244" + compact;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    if (needsMfa) {
      if (!factorId || !challengeId || mfaCode.length !== 6) {
        setError("Introduza o código de 6 dígitos do seu autenticador.");
        setLoading(false);
        return;
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: mfaCode,
      });
      if (verifyError) {
        setError(verifyError.message);
        setLoading(false);
        return;
      }
      window.location.replace(redirectPath);
      return;
    }

    const credentials = method === "email" ? { email, password } : { phone: normalizePhone(phone), password };
    if (method === "phone" && !/^\+[1-9]\d{7,14}$/.test(credentials.phone ?? "")) {
      setError("Introduza um número de telefone válido com indicativo internacional.");
      setLoading(false);
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithPassword(credentials);
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // Never turn an MFA lookup outage into an MFA bypass. Keep the valid
    // password session, but require a retry before entering the application.
    try {
      const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError) {
        setError("A sessão foi iniciada, mas não foi possível confirmar o estado da verificação MFA. Tente novamente; a sua sessão continua ativa.");
        setLoading(false);
        return;
      }

      if (aal?.currentLevel === "aal1" && aal.nextLevel === "aal2") {
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) {
          setError("A sessão foi iniciada, mas não foi possível consultar o autenticador MFA. Tente novamente; a sua sessão continua ativa.");
          setLoading(false);
          return;
        }

        const verifiedFactor = factors.totp.find((factor) => factor.status === "verified");
        if (verifiedFactor) {
          const challenge = await supabase.auth.mfa.challenge({ factorId: verifiedFactor.id });
          if (challenge.error) {
            setError("Não foi possível iniciar a verificação MFA. Tente novamente; a sua sessão de palavra-passe continua ativa.");
            setLoading(false);
            return;
          }
          setFactorId(verifiedFactor.id);
          setChallengeId(challenge.data.id);
          setNeedsMfa(true);
          setLoading(false);
          return;
        }
      }
    } catch {
      setError("A sessão foi iniciada, mas não foi possível confirmar a verificação de segurança. Tente novamente; a sua sessão continua ativa.");
      setLoading(false);
      return;
    }

    window.location.replace(redirectPath);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      {!needsMfa ? <>
        <div className="grid grid-cols-2 rounded-xl bg-[var(--zion-light)] p-1" role="group" aria-label="Método de entrada">
          <button type="button" onClick={() => { setMethod("phone"); setError(""); }} aria-pressed={method === "phone"} className={method === "phone" ? "rounded-lg bg-white px-3 py-2 text-sm font-semibold text-[var(--zion-primary)] shadow-sm" : "rounded-lg px-3 py-2 text-sm text-[var(--zion-muted)]"}>Telefone</button>
          <button type="button" onClick={() => { setMethod("email"); setError(""); }} aria-pressed={method === "email"} className={method === "email" ? "rounded-lg bg-white px-3 py-2 text-sm font-semibold text-[var(--zion-primary)] shadow-sm" : "rounded-lg px-3 py-2 text-sm text-[var(--zion-muted)]"}>Email</button>
        </div>
        {method === "phone" ? <label className="block">
          <span className="text-sm font-medium text-[var(--zion-dark)]">Número de telefone</span>
          <input type="tel" required autoComplete="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="923 000 000 ou +244 923 000 000" className="mt-2 w-full rounded-xl border border-[var(--zion-border)] px-4 py-3 outline-none focus:border-[var(--zion-sky)] focus:ring-4 focus:ring-[var(--zion-sky)]/10" />
        </label> : <label className="block">
          <span className="text-sm font-medium text-[var(--zion-dark)]">Email</span>
          <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--zion-border)] px-4 py-3 outline-none focus:border-[var(--zion-sky)] focus:ring-4 focus:ring-[var(--zion-sky)]/10" />
        </label>}
        <label className="block">
          <span className="text-sm font-medium text-[var(--zion-dark)]">Palavra-passe</span>
          <input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--zion-border)] px-4 py-3 outline-none transition focus:border-[var(--zion-sky)] focus:ring-4 focus:ring-[var(--zion-sky)]/10" />
        </label>
        <div className="flex justify-end">{method === "email" && <Link href="/auth/forgot-password" className="text-sm font-medium text-[var(--zion-primary)] underline underline-offset-4">Esqueci-me da palavra-passe</Link>}</div>
      </> : <>
        <div className="rounded-xl border border-[var(--zion-border)] bg-[var(--zion-light)] p-4">
          <p className="font-semibold text-[var(--zion-dark)]">Verificação de segurança</p>
          <p className="mt-1 text-sm text-[var(--zion-muted)]">Introduza o código de 6 dígitos da sua aplicação autenticadora.</p>
        </div>
        <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Código de 6 dígitos" className="w-full rounded-xl border border-[var(--zion-border)] px-4 py-3 text-center tracking-[0.3em] outline-none focus:border-[var(--zion-sky)] focus:ring-4 focus:ring-[var(--zion-sky)]/10" />
      </>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={loading} className="w-full rounded-xl bg-[var(--zion-primary)] px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-[var(--zion-primary-deep)] disabled:opacity-60">{loading ? "A processar..." : needsMfa ? "Verificar código" : "Entrar no ZION OS"}</button>
      {needsMfa && <button type="button" onClick={() => { setNeedsMfa(false); setMfaCode(""); setFactorId(""); setChallengeId(""); setError(""); }} className="w-full rounded-xl border border-[var(--zion-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--zion-dark)] transition hover:border-[var(--zion-sky)]">Voltar</button>}
    </form>
  );
}

export default function SignInPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--zion-dark)] px-6 py-12">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3')" }} aria-hidden="true" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(7,30,53,0.94),rgba(11,45,77,0.84))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(200,162,74,0.25),transparent_36%)]" />
      <section className="relative w-full max-w-md rounded-3xl border border-white/20 bg-white/95 p-8 shadow-[var(--zion-shadow-lg)] backdrop-blur-xl sm:p-9">
        <div className="mb-8 h-1 w-12 rounded-full bg-[var(--zion-gold)]" />
        <p className="text-sm font-semibold tracking-[0.22em] text-[var(--zion-muted)]">ZION OS</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--zion-dark)]">Entrar</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--zion-muted)]">Aceda ao sistema operativo ZION OS.</p>
        <p className="mt-3 text-sm text-[var(--zion-muted)]">Não sabe qual área deve abrir?{" "}<Link href="/auth/access" className="font-semibold text-[var(--zion-primary)] underline underline-offset-4">Escolher perfil de entrada</Link></p>
        <Suspense fallback={<div className="mt-8 h-48 animate-pulse rounded-xl bg-[var(--zion-light)]" />}><SignInForm /></Suspense>
        <p className="mt-6 text-sm text-[var(--zion-muted)]">Ainda não tem conta?{" "}<Link href="/auth/sign-up" className="font-semibold text-[var(--zion-primary)] underline underline-offset-4">Criar conta</Link></p>
      </section>
    </main>
  );
}
