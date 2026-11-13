"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Credential = { username: string; email: string; password: string };
type ProvisionResult = { username: string; email?: string; status: string; reason?: string };

export default function DemoAccountsProvisioner() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [results, setResults] = useState<ProvisionResult[]>([]);
  const [copied, setCopied] = useState(false);

  async function createAccounts() {
    setLoading(true);
    setError("");
    setCredentials([]);
    setResults([]);
    setCopied(false);
    try {
      const supabase = createClient();
      const { data, error: invokeError } = await supabase.functions.invoke("zion-demo-accounts", { body: {} });
      if (invokeError) throw new Error(invokeError.message || "Não foi possível executar a criação das contas.");
      if (!data) throw new Error("O serviço não devolveu um resultado.");
      if (data.error) throw new Error(data.error);
      setCredentials(Array.isArray(data.credentials) ? data.credentials : []);
      setResults(Array.isArray(data.results) ? data.results : []);
      if (data.ok !== true) setError("A operação terminou com ocorrências. Verifique o estado individual de cada conta antes de repetir.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha inesperada ao criar as contas.");
    } finally {
      setLoading(false);
    }
  }

  async function copyCredentials() {
    const content = credentials.map((item) => item.username + "\n" + item.email + "\n" + item.password).join("\n\n");
    await navigator.clipboard.writeText(content);
    setCopied(true);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Administração global verificada</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#0C1A3D]">Contas de demonstração ZION / RESA</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Cria as sete contas de teste da IASD Porto Seco e uma conta pública do RESA. O processo confirma os e-mails administrativamente, não envia códigos e associa os perfis aos cargos existentes.</p>
      </div>

      <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-semibold text-amber-950">Antes de executar</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
          <li>As palavras-passe são geradas automaticamente e mostradas apenas nesta execução.</li>
          <li>Os endereços usam o domínio reservado .test: não recebem mensagens nem permitem recuperação por e-mail.</li>
          <li>Guarda as credenciais num local seguro. Uma segunda execução não revela novamente palavras-passe já criadas.</li>
          <li>A função só aceita sessões de administradores globais verificados.</li>
        </ul>
      </section>

      <button type="button" onClick={createAccounts} disabled={loading} className="mt-6 rounded-xl bg-[#0C1A3D] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#17345B] disabled:cursor-not-allowed disabled:opacity-60">
        {loading ? "A criar e configurar contas..." : "Criar as 8 contas de demonstração"}
      </button>

      {error && <p role="alert" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">{error}</p>}

      {results.length > 0 && (
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-[#0C1A3D]">Resultado por conta</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {results.map((item) => (
              <div key={item.username} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div><p className="font-medium text-slate-900">{item.username}</p><p className="text-slate-500">{item.email || ""}</p></div>
                <span className={item.status === "created" || item.status === "already_created" ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800" : "rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"}>{item.status}</span>
                {item.reason && <p className="w-full text-xs text-red-700">{item.reason}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {credentials.length > 0 && (
        <section className="mt-8 rounded-2xl border border-emerald-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-lg font-semibold text-[#0C1A3D]">Credenciais geradas</h2><p className="mt-1 text-xs text-slate-500">Estas palavras-passe só serão apresentadas nesta execução.</p></div>
            <button type="button" onClick={copyCredentials} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">{copied ? "Copiado" : "Copiar credenciais"}</button>
          </div>
          <div className="mt-4 space-y-3">
            {credentials.map((item) => (
              <article key={item.username} className="rounded-xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">{item.username}</p>
                <p className="mt-1 break-all text-sm text-slate-600">{item.email}</p>
                <p className="mt-2 break-all font-mono text-sm text-[#0C1A3D]">{item.password}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
