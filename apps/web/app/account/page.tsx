"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data, error: userError }) => {
      if (userError) setError(userError.message);
      else setEmail(data.user?.email ?? "");
      setLoading(false);
    });
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

  if (loading) {
    return <main className="min-h-screen bg-slate-50 p-6 lg:p-10"><div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 text-slate-500">A carregar a conta…</div></main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-[28px] bg-[#0C1A3D] p-8 text-white shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">ZION OS</p>
          <h1 className="mt-2 text-3xl font-semibold">Conta e segurança</h1>
          <p className="mt-2 text-sm text-slate-300">Credenciais e acesso pertencem à conta; informações pessoais pertencem ao perfil.</p>
        </header>

        {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {message && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="border-b border-slate-100 pb-5">
            <h2 className="text-xl font-semibold text-[#0C1A3D]">Email de acesso</h2>
            <p className="mt-1 text-sm text-slate-500">Email atual: <span className="font-medium text-slate-700">{email || "não disponível"}</span></p>
          </div>
          <form onSubmit={updateEmail} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input type="email" required autoComplete="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Novo endereço de email" className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" />
            <button type="submit" disabled={savingEmail} className="rounded-2xl bg-[#0C1A3D] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
              {savingEmail ? "A atualizar…" : "Alterar email"}
            </button>
          </form>
          <p className="mt-3 text-xs text-slate-400">A confirmação é tratada pelo sistema de autenticação antes da alteração ficar efetiva.</p>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="border-b border-slate-100 pb-5">
            <h2 className="text-xl font-semibold text-[#0C1A3D]">Palavra-passe</h2>
            <p className="mt-1 text-sm text-slate-500">Altere a credencial usada para entrar no ZION.</p>
          </div>
          <form onSubmit={updatePassword} className="mt-6 grid gap-4 sm:grid-cols-2">
            <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Nova palavra-passe" className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" />
            <input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar palavra-passe" className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" />
            <div className="sm:col-span-2">
              <button type="submit" disabled={savingPassword} className="rounded-2xl bg-[#0C1A3D] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                {savingPassword ? "A atualizar…" : "Atualizar palavra-passe"}
              </button>
            </div>
          </form>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href="/profile" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#0C1A3D]">Voltar ao perfil</Link>
          <Link href="/auth/forgot-password" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#0C1A3D]">Recuperar palavra-passe</Link>
        </div>
      </div>
    </main>
  );
}
