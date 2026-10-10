"use client";

import { useState, type FormEvent } from "react";
import { resaRequest } from "@/lib/resa/api";
import { OrganizationSelector, ZionOrganization } from "@/components/organization/OrganizationSelector";

type Account = { id: string; code: string; name: string; account_type: string; currency_code: string; parent_account_id: string | null; is_active: boolean };
type Entry = { id: string; entry_number: number; entry_date: string; description: string; status: string };

export default function Finance() {
  const [organizationId, setOrganizationId] = useState("");
  const [organization, setOrganization] = useState<ZionOrganization | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journal, setJournal] = useState<Entry[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("ASSET");
  const [currency, setCurrency] = useState("AOA");
  const [description, setDescription] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [debitAccountId, setDebitAccountId] = useState("");
  const [creditAccountId, setCreditAccountId] = useState("");
  const [amount, setAmount] = useState("");

  async function refresh(id: string) {
    const [nextAccounts, nextJournal] = await Promise.all([
      resaRequest<Account[]>(`/v1/finance/organizations/${id}/accounts`),
      resaRequest<Entry[]>(`/v1/finance/organizations/${id}/journal`),
    ]);
    setAccounts(nextAccounts);
    setJournal(nextJournal);
    setDebitAccountId(nextAccounts[0]?.id ?? "");
    setCreditAccountId(nextAccounts[1]?.id ?? "");
  }

  const load = (id: string, org: ZionOrganization) => {
    setOrganizationId(id);
    setOrganization(org);
    setError("");
    setNotice("");
    void refresh(id).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Não foi possível carregar os dados financeiros."));
  };

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const created = await resaRequest<Account>(`/v1/finance/organizations/${organizationId}/accounts`, {
        method: "POST",
        body: JSON.stringify({ code: code.trim(), name: accountName.trim(), account_type: accountType, currency_code: currency.trim().toUpperCase() }),
      });
      setAccounts((current) => [...current, created].sort((a, b) => a.code.localeCompare(b.code)));
      setCode(""); setAccountName("");
      setNotice(`Conta ${created.code} · ${created.name} criada.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível criar a conta.");
    } finally { setBusy(false); }
  }

  async function createJournal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || busy) return;
    if (debitAccountId === creditAccountId) { setError("Escolha duas contas diferentes."); return; }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || Math.abs(value * 100 - Math.round(value * 100)) > 1e-8) { setError("Introduza um valor positivo com até duas casas decimais."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const created = await resaRequest<Entry>(`/v1/finance/organizations/${organizationId}/journal`, {
        method: "POST",
        body: JSON.stringify({
          description: description.trim(), entry_date: entryDate,
          lines: [
            { account_id: debitAccountId, debit: value, credit: 0, description: description.trim() },
            { account_id: creditAccountId, debit: 0, credit: value, description: description.trim() },
          ],
        }),
      });
      setJournal((current) => [created, ...current]);
      setDescription(""); setAmount("");
      setNotice(`Lançamento #${created.entry_number} publicado e equilibrado.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível publicar o lançamento.");
    } finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-[var(--zion-light)] p-6 lg:p-10"><div className="mx-auto max-w-7xl">
    <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[var(--zion-gold)]">Finance Engine</p><h1 className="mt-2 text-3xl font-semibold text-[var(--zion-dark)]">Finanças</h1><p className="mt-2 max-w-2xl text-slate-500">Plano de contas, livro diário e lançamentos de dupla entrada com validação de equilíbrio e moeda.</p></div><OrganizationSelector value={organizationId} onChange={load}/></header>
    {organization&&<div className="mb-5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Organização: <strong className="text-slate-900">{organization.name}</strong> · {organization.organization_type}</div>}
    {error&&<div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {notice&&<div aria-live="polite" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
    <div className="mb-6 grid gap-5 lg:grid-cols-2">
      <form onSubmit={createAccount} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Adicionar conta ao plano</h2>
        <p className="mt-1 text-xs text-slate-500">A permissão Finance Manager é necessária para guardar contas.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input required maxLength={32} value={code} onChange={(event) => setCode(event.target.value)} placeholder="Código (ex.: 1000)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input required maxLength={160} value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="Nome da conta" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <select value={accountType} onChange={(event) => setAccountType(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="ASSET">Ativo</option><option value="LIABILITY">Passivo</option><option value="EQUITY">Capital próprio</option><option value="REVENUE">Receita</option><option value="EXPENSE">Despesa</option></select>
          <input required minLength={3} maxLength={3} value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} aria-label="Moeda ISO" placeholder="Moeda (AOA)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase" />
        </div>
        <button disabled={!organizationId || !code.trim() || !accountName.trim() || busy} className="mt-4 rounded-xl bg-[#0C1A3D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy ? "A guardar…" : "Criar conta"}</button>
      </form>

      <form onSubmit={createJournal} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Novo lançamento equilibrado</h2>
        <p className="mt-1 text-xs text-slate-500">Um débito e um crédito em contas ativas da mesma organização/moeda; a gravação é transacional.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input required maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descrição" className="rounded-xl border border-slate-200 px-3 py-2 text-sm sm:col-span-2" />
          <input required type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input required type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Valor" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <select required value={debitAccountId} onChange={(event) => setDebitAccountId(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Conta de débito</option>{accounts.filter((account) => account.is_active).map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name} ({account.currency_code})</option>)}</select>
          <select required value={creditAccountId} onChange={(event) => setCreditAccountId(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Conta de crédito</option>{accounts.filter((account) => account.is_active).map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name} ({account.currency_code})</option>)}</select>
        </div>
        <button disabled={!organizationId || accounts.filter((account) => account.is_active).length < 2 || busy || !description.trim() || !amount} className="mt-4 rounded-xl bg-[#0C1A3D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy ? "A publicar…" : "Publicar lançamento"}</button>
        {accounts.filter((account) => account.is_active).length < 2 && <p className="mt-3 text-xs text-amber-700">Registe pelo menos duas contas ativas antes de criar um lançamento.</p>}
      </form>
    </div>

    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-semibold">Plano de contas</h2></div><div className="divide-y">{accounts.map((account) => <div key={account.id} className="flex items-center justify-between p-4"><div><p className="font-medium">{account.code} · {account.name}</p><p className="text-xs text-slate-500">{account.account_type}</p></div><span className="text-xs">{account.currency_code}</span></div>)}{!accounts.length&&<p className="p-5 text-sm text-slate-500">Nenhuma conta configurada. Adicione as contas necessárias acima.</p>}</div></section>
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-semibold">Livro diário</h2></div><div className="divide-y">{journal.map((entry) => <div key={entry.id} className="p-4"><p className="font-medium">#{entry.entry_number} · {entry.description}</p><p className="mt-1 text-xs text-slate-500">{entry.entry_date} · {entry.status}</p></div>)}{!journal.length&&<p className="p-5 text-sm text-slate-500">Nenhum lançamento registado.</p>}</div></section>
    </div>
  </div></main>;
}
