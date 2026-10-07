"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session));
      if (!data.session) setError("O link de recuperação é inválido ou expirou.");
    });
  }, [supabase.auth]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("A palavra-passe deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As palavras-passe não coincidem.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else {
      setMessage("Palavra-passe atualizada. Pode entrar novamente.");
      await supabase.auth.signOut();
    }
    setLoading(false);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--zion-light)] px-6 py-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(200,162,74,0.14),transparent_35%),linear-gradient(135deg,rgba(11,45,77,0.06),transparent_55%)]" />
      <section className="relative w-full max-w-md rounded-3xl border border-[var(--zion-border)] bg-white p-8 shadow-[var(--zion-shadow-lg)] sm:p-9">
        <div className="mb-8 h-1 w-12 rounded-full bg-[var(--zion-gold)]" />
        <p className="text-sm font-semibold tracking-[0.22em] text-[var(--zion-muted)]">ZION OS</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--zion-dark)]">Nova palavra-passe</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--zion-muted)]">Defina uma nova palavra-passe para a sua conta.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <input type="password" required minLength={8} autoComplete="new-password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-[var(--zion-border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--zion-sky)] focus:ring-4 focus:ring-[var(--zion-sky)]/10"
            placeholder="Nova palavra-passe" />
          <input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl border border-[var(--zion-border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--zion-sky)] focus:ring-4 focus:ring-[var(--zion-sky)]/10"
            placeholder="Confirmar palavra-passe" />
          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {message && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
          <button type="submit" disabled={loading || !ready}
            className="w-full rounded-xl bg-[var(--zion-primary)] px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-[var(--zion-primary-deep)] disabled:opacity-60">
            {loading ? "A atualizar..." : "Atualizar palavra-passe"}
          </button>
        </form>
        <p className="mt-6 text-sm text-[var(--zion-muted)]">
          <Link href="/auth/sign-in" className="font-semibold text-[var(--zion-primary)] underline underline-offset-4">Voltar ao acesso</Link>
        </p>
      </section>
    </main>
  );
}
