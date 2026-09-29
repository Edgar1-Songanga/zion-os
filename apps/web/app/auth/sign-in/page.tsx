"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const redirectPath = next?.startsWith("/") ? next : "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    window.location.assign(redirectPath);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <section className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-xl p-8">
        <p className="text-sm font-semibold tracking-widest text-slate-500">ZION OS</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#0C1A3D]">Entrar</h1>
        <p className="mt-2 text-slate-500">Aceda ao sistema operativo ZION OS.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#D4AF37]"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Palavra-passe</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#D4AF37]"
            />
          </label>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#0C1A3D] px-4 py-3 font-semibold text-white disabled:opacity-60"
          >
            {loading ? "A entrar..." : "Entrar no ZION OS"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-500">
          Ainda não tem conta?{" "}
          <Link href="/auth/sign-up" className="font-semibold text-[#0C1A3D] underline">
            Criar conta
          </Link>
        </p>
      </section>
    </main>
  );
}
