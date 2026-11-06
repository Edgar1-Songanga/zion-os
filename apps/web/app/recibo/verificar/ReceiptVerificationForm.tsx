"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type VerifiedReceipt = {
  valid: boolean;
  receipt_number?: string | number;
  issued_at?: string;
  issuer_name?: string;
  amount?: number | string;
  currency_code?: string;
  content_hash?: string;
};

type Props = { initialCode: string };

export default function ReceiptVerificationForm({ initialCode }: Props) {
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [result, setResult] = useState<VerifiedReceipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function verify(value: string) {
    const normalized = value.trim().toUpperCase();
    if (!/^[A-F0-9]{16,64}$/.test(normalized)) {
      setError("Introduza um código hexadecimal válido com 16 a 64 caracteres.");
      setResult(null);
      return;
    }

    setBusy(true);
    setError("");
    setResult(null);
    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("verify_giving_receipt", {
        p_code: normalized,
      });
      if (rpcError) throw rpcError;
      const receipt = data as VerifiedReceipt | null;
      setResult(receipt ?? { valid: false });
    } catch {
      setError("Não foi possível concluir a verificação. Tente novamente mais tarde.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (initialCode) void verify(initialCode);
    // The initial query code is intentionally processed only on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function formatAmount(amount: number | string, currency: string) {
    const value = Number(amount);
    if (!Number.isFinite(value)) return String(amount);
    try {
      return new Intl.NumberFormat("pt-AO", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `${value.toLocaleString("pt-AO")} ${currency}`;
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f3ed] px-4 py-10 text-[#142342] sm:px-6">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#142342] text-2xl text-[#d9bd79]">✦</div>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[.24em] text-[#9b7b37]">ZION OS · TESOURARIA</p>
          <h1 className="mt-2 text-3xl font-semibold">Verificar recibo</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
            Confirme se um recibo foi emitido pelo sistema ZION e se os seus dados essenciais correspondem ao registo institucional.
          </p>
        </header>

        <section className="rounded-[26px] border border-[#e7e2d6] bg-white p-5 shadow-sm sm:p-7">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void verify(code);
            }}
          >
            <label htmlFor="receipt-code" className="mb-2 block text-sm font-semibold">Código de verificação</label>
            <input
              id="receipt-code"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={64}
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-F0-9]/g, ""))}
              placeholder="Ex.: 32 caracteres hexadecimais"
              className="w-full rounded-xl border border-slate-200 bg-[#fbfbfa] px-4 py-3 font-mono text-sm tracking-wider outline-none focus:border-[#b89a55]"
            />
            <button
              type="submit"
              disabled={busy || code.length < 16}
              className="mt-4 w-full rounded-xl bg-[#142342] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "A verificar…" : "Verificar autenticidade"}
            </button>
          </form>

          {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

          {result && (
            <section aria-live="polite" className={`mt-5 rounded-2xl border p-5 ${result.valid ? "border-emerald-200 bg-emerald-50/70" : "border-amber-200 bg-amber-50"}`}>
              <div className="flex items-center gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-full text-lg font-bold ${result.valid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                  {result.valid ? "✓" : "!"}
                </span>
                <div>
                  <h2 className="font-semibold">{result.valid ? "Recibo válido" : "Recibo não encontrado"}</h2>
                  <p className="mt-1 text-xs text-slate-600">
                    {result.valid ? "O código corresponde a um recibo registado no ZION." : "Não foi encontrado um recibo correspondente a este código."}
                  </p>
                </div>
              </div>

              {result.valid && (
                <dl className="mt-5 grid gap-3 border-t border-emerald-200/70 pt-4 text-sm sm:grid-cols-[150px_1fr]">
                  <dt className="text-slate-500">Número do recibo</dt>
                  <dd className="font-semibold">{result.receipt_number ?? "—"}</dd>
                  <dt className="text-slate-500">Instituição emissora</dt>
                  <dd className="font-semibold">{result.issuer_name ?? "—"}</dd>
                  <dt className="text-slate-500">Valor</dt>
                  <dd className="font-semibold">{result.amount !== undefined && result.currency_code ? formatAmount(result.amount, result.currency_code) : "—"}</dd>
                  <dt className="text-slate-500">Data de emissão</dt>
                  <dd className="font-semibold">{result.issued_at ? new Date(result.issued_at).toLocaleString("pt-AO") : "—"}</dd>
                  <dt className="text-slate-500">Hash de integridade</dt>
                  <dd className="break-all font-mono text-[11px]">{result.content_hash ?? "—"}</dd>
                </dl>
              )}
            </section>
          )}
        </section>

        <p className="mx-auto mt-5 max-w-xl text-center text-xs leading-5 text-slate-500">
          A verificação pública apresenta apenas dados essenciais do recibo. Não revela a identidade nem os dados pessoais do contribuinte.
        </p>
        <footer className="mt-8 text-center text-[10px] tracking-wider text-slate-400">ZION OS · VERIFICAÇÃO INSTITUCIONAL</footer>
      </div>
    </main>
  );
}
