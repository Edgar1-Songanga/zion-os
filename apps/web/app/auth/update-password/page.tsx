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
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <section className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-xl p-8">
        <p className="text-sm font-semibold tracking-widest text-slate-500">ZION OS</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#0C1A3D]">Nova palavra-passe</h1>
        <p className="mt-2 text-slate-500">Defina uma nova palavra-passe para a sua conta.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <input type="password" required minLength={8} autoComplete="new-password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#D4AF37]"
            placeholder="Nova palavra-passe" />
          <input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#D4AF37]"
            placeholder="Confirmar palavra-passe" />
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {message && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
          <button type="submit" disabled={loading || !ready}
            className="w-full rounded-xl bg-[#0C1A3D] px-4 py-3 font-semibold text-white disabled:opacity-60">
            {loading ? "A atualizar..." : "Atualizar palavra-passe"}
          </button>
        </form>
        <p className="mt-6 text-sm text-slate-500">
          <Link href="/auth/sign-in" className="font-semibold text-[#0C1A3D] underline">Voltar ao acesso</Link>
        </p>
      </section>
    </main>
  );
}
