"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (error) setError(error.message);
    else setMessage("Conta criada. Verifique o seu email para concluir a ativação.");

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

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-[var(--zion-dark)]">Email</span>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--zion-border)] px-4 py-3 outline-none transition focus:border-[var(--zion-sky)] focus:ring-4 focus:ring-[var(--zion-sky)]/10" />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--zion-dark)]">Palavra-passe</span>
            <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--zion-border)] px-4 py-3 outline-none transition focus:border-[var(--zion-sky)] focus:ring-4 focus:ring-[var(--zion-sky)]/10" />
          </label>

          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {message && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}

          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-[var(--zion-primary)] px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-[var(--zion-primary-deep)] disabled:opacity-60">
            {loading ? "A criar..." : "Criar conta"}
          </button>
        </form>

        <p className="mt-6 text-sm text-[var(--zion-muted)]">
          Já tem conta? <Link href="/auth/sign-in" className="font-semibold text-[var(--zion-primary)] underline underline-offset-4">Entrar</Link>
        </p>
      </section>
    </main>
  );
}
