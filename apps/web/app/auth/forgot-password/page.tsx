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
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <section className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-xl p-8">
        <p className="text-sm font-semibold tracking-widest text-slate-500">ZION OS</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#0C1A3D]">Recuperar acesso</h1>
        <p className="mt-2 text-slate-500">Introduza o email da sua conta.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <input type="email" required autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#D4AF37]"
            placeholder="nome@exemplo.com" />
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {message && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-[#0C1A3D] px-4 py-3 font-semibold text-white disabled:opacity-60">
            {loading ? "A enviar..." : "Enviar instruções"}
          </button>
        </form>
        <p className="mt-6 text-sm text-slate-500">
          <Link href="/auth/sign-in" className="font-semibold text-[#0C1A3D] underline">Voltar ao acesso</Link>
        </p>
      </section>
    </main>
  );
}
