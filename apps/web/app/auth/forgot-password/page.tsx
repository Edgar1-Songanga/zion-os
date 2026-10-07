"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    if (error) setError(error.message);
    else setMessage("Se o endereço estiver associado a uma conta, receberá instruções para redefinir a palavra-passe.");

    setLoading(false);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--zion-light)] px-6 py-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(200,162,74,0.14),transparent_35%),linear-gradient(135deg,rgba(11,45,77,0.06),transparent_55%)]" />
      <section className="relative w-full max-w-md rounded-3xl border border-[var(--zion-border)] bg-white p-8 shadow-[var(--zion-shadow-lg)] sm:p-9">
        <div className="mb-8 h-1 w-12 rounded-full bg-[var(--zion-gold)]" />
        <p className="text-sm font-semibold tracking-[0.22em] text-[var(--zion-muted)]">ZION OS</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--zion-dark)]">Recuperar acesso</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--zion-muted)]">Introduza o email da sua conta.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <input type="email" required autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-[var(--zion-border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--zion-sky)] focus:ring-4 focus:ring-[var(--zion-sky)]/10"
            placeholder="nome@exemplo.com" />
          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {message && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-[var(--zion-primary)] px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-[var(--zion-primary-deep)] disabled:opacity-60">
            {loading ? "A enviar..." : "Enviar instruções"}
          </button>
        </form>
        <p className="mt-6 text-sm text-[var(--zion-muted)]">
          <Link href="/auth/sign-in" className="font-semibold text-[var(--zion-primary)] underline underline-offset-4">Voltar ao acesso</Link>
        </p>
      </section>
    </main>
  );
}
