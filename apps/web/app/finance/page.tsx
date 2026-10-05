"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Organization = { id: string; name: string };
type Contribution = { id: string; contribution_type: string; amount_minor: number; currency: string; status: string; occurred_on: string };
type Staff = { id: string; legal_name: string; employee_number: string; department?: string; base_salary_minor: number; currency: string; payment_method: string; active: boolean };
type PayrollRun = { id: string; period_start: string; period_end: string; currency: string; status: string; total_gross_minor: number; total_deductions_minor: number; total_net_minor: number; external_payment_reference?: string };
type PayrollItem = { id: string; staff_id: string; gross_minor: number; deductions_minor: number; net_minor: number; status: string; payslip_number: string; paid_at?: string };
type Summary = { contributions: Contribution[]; staff: Staff[]; payrollRuns: PayrollRun[] };
type MemberContribution = Contribution & { receipt_number?: string; paid_at?: string; payment_method: string };

const money = (minor: number, currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(minor / 100);

export default function FinancePage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [message, setMessage] = useState("A carregar o centro financeiro…");
  const [busy, setBusy] = useState(false);
  const [contribution, setContribution] = useState({ contribution_type: "TITHE", amount_minor: "", currency: "USD" });
  const [staff, setStaff] = useState({ legal_name: "", employee_number: "", department: "", base_salary_minor: "", currency: "USD", payment_method: "BANK_TRANSFER" });
  const [payroll, setPayroll] = useState({ period_start: "", period_end: "", currency: "USD", deductions_minor: "0" });
  const [payslips, setPayslips] = useState<PayrollItem[]>([]);
  const [memberOrganization, setMemberOrganization] = useState<Organization | null>(null);
  const [memberContributions, setMemberContributions] = useState<MemberContribution[]>([]);
  const [memberPayment, setMemberPayment] = useState({ contribution_type: "TITHE", amount_minor: "", currency: "USD", payment_method: "CARD" });

  async function load() {
    try {
      const organizations = await resaRequest<Organization[]>("/v1/organizations");
      const first = organizations[0];
      const directory = await resaRequest<Organization[]>("/v1/organizations/directory");
      const memberOrg = directory[0] ?? first;
      if (memberOrg) { setMemberOrganization(memberOrg); setMemberContributions(await resaRequest<MemberContribution[]>(`/v1/finance/organizations/${memberOrg.id}/my-contributions`)); }
      if (first) { setOrganization(first); setSummary(await resaRequest<Summary>(`/v1/finance/organizations/${first.id}/summary`)); }
      if (!memberOrg && !first) { setMessage("Nenhuma organização foi encontrada."); return; }
      setMessage("");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Não foi possível carregar os dados financeiros.");
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function submit(event: FormEvent, path: string, body: unknown) {
    event.preventDefault();
    if (!organization) return;
    setBusy(true);
    try {
      await resaRequest(path.replace(":organizationId", organization.id), { method: "POST", body: JSON.stringify(body) });
      await load();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "A operação financeira falhou.");
    } finally { setBusy(false); }
  }

  async function action(path: string, method: "GET" | "PATCH" | "POST", body?: unknown) {
    setBusy(true);
    try { await resaRequest(path, { method, body: body ? JSON.stringify(body) : undefined }); await load(); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "A operação financeira falhou."); }
    finally { setBusy(false); }
  }

  async function viewPayslips(runId: string) {
    setBusy(true);
    try { setPayslips(await resaRequest<PayrollItem[]>(`/v1/finance/payroll-runs/${runId}/items`)); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "Não foi possível carregar os payslips."); }
    finally { setBusy(false); }
  }

  async function submitMemberPayment(event: FormEvent) {
    event.preventDefault();
    if (!memberOrganization) return;
    setBusy(true);
    try {
      const result = await resaRequest<{ contribution: MemberContribution; next_step: string }>(`/v1/finance/organizations/${memberOrganization.id}/my-contributions`, { method: "POST", body: JSON.stringify({ ...memberPayment, amount_minor: Number(memberPayment.amount_minor) }) });
      setMessage(result.next_step);
      setMemberContributions(await resaRequest<MemberContribution[]>(`/v1/finance/organizations/${memberOrganization.id}/my-contributions`));
      setMemberPayment((current) => ({ ...current, amount_minor: "" }));
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Não foi possível iniciar o pagamento."); }
    finally { setBusy(false); }
  }

  async function downloadReceipt(id: string) {
    try {
      const receipt = await resaRequest<{ receipt_number: string; issued_at: string; contribution: MemberContribution }>(`/v1/finance/my-contributions/${id}/receipt`);
      const item = receipt.contribution;
      const html = `<html><body style="font-family:Arial;padding:40px"><h1>ZION Contribution Receipt</h1><p><strong>Receipt:</strong> ${receipt.receipt_number}</p><p><strong>Type:</strong> ${item.contribution_type}</p><p><strong>Amount:</strong> ${money(item.amount_minor, item.currency)}</p><p><strong>Payment method:</strong> ${item.payment_method}</p><p><strong>Paid at:</strong> ${new Date(receipt.issued_at).toLocaleString()}</p><p>Thank you for your faithful stewardship.</p></body></html>`;
      const url = URL.createObjectURL(new Blob([html], { type: "text/html" })); const link = document.createElement("a"); link.href = url; link.download = `${receipt.receipt_number}.html`; link.click(); URL.revokeObjectURL(url);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Receipt is not available until payment confirmation."); }
  }

  const contributionTotal = useMemo(() => summary?.contributions.filter((item) => item.status === "RECEIVED").reduce((sum, item) => sum + Number(item.amount_minor), 0) ?? 0, [summary]);
  const payrollTotal = useMemo(() => summary?.payrollRuns.filter((item) => item.status !== "CANCELLED").reduce((sum, item) => sum + Number(item.total_net_minor), 0) ?? 0, [summary]);

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-3xl bg-[#0C1A3D] p-8 text-white shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#D4AF37]">Finance and stewardship</p>
          <h1 className="mt-3 text-4xl font-bold">Finance Center</h1>
          <p className="mt-3 max-w-3xl text-white/70">Contributions, staff compensation, payroll approval, payslip references and auditable settlement records.</p>
          <p className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">This workspace records and controls finance operations. It does not transfer money to a bank or mobile-money provider until an approved external payment connector is configured.</p>
        </header>

        {memberOrganization && <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <form onSubmit={submitMemberPayment} className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8B6F16]">Member giving</p>
            <h2 className="mt-2 text-2xl font-bold text-[#0C1A3D]">Tithe, offering or donation</h2>
            <p className="mt-2 text-sm text-slate-500">Submit a secure payment intent for {memberOrganization.name}. A receipt becomes downloadable immediately after the payment is confirmed.</p>
            <Select label="Contribution type" value={memberPayment.contribution_type} onChange={(value) => setMemberPayment({ ...memberPayment, contribution_type: value })} options={["TITHE", "OFFERING", "DONATION"]} />
            <Input label="Amount in minor units" value={memberPayment.amount_minor} onChange={(value) => setMemberPayment({ ...memberPayment, amount_minor: value })} type="number" />
            <Input label="Currency" value={memberPayment.currency} onChange={(value) => setMemberPayment({ ...memberPayment, currency: value.toUpperCase() })} />
            <Select label="Payment method" value={memberPayment.payment_method} onChange={(value) => setMemberPayment({ ...memberPayment, payment_method: value })} options={["CARD", "MOBILE_MONEY", "BANK_TRANSFER", "CASH"]} />
            <button disabled={busy} className="mt-5 rounded-xl bg-[#0C1A3D] px-4 py-3 font-semibold text-white disabled:opacity-50">Start payment</button>
          </form>
          <div className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-[#0C1A3D]">My contributions and receipts</h2><div className="mt-5 space-y-3">{memberContributions.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"><div><p className="font-semibold text-[#0C1A3D]">{item.contribution_type} · {money(item.amount_minor, item.currency)}</p><p className="text-sm text-slate-500">{item.status} · {item.payment_method}</p>{item.receipt_number && <p className="text-xs text-slate-400">Receipt {item.receipt_number}</p>}</div>{item.status === "RECEIVED" && item.receipt_number && <button onClick={() => void downloadReceipt(item.id)} className="rounded-lg bg-[#D4AF37] px-3 py-2 text-sm font-semibold text-[#0C1A3D]">Download receipt</button>}</div>)}{!memberContributions.length && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No contributions submitted yet.</p>}</div></div>
        </section>}

        {message && <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">{message}</div>}
        {summary && <>
          <section className="grid gap-6 md:grid-cols-3">
            <Metric label="Received contributions" value={money(contributionTotal, "USD")} />
            <Metric label="Active staff" value={String(summary.staff.filter((item) => item.active).length)} />
            <Metric label="Payroll net value" value={money(payrollTotal, "USD")} />
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <form onSubmit={(event) => submit(event, "/v1/finance/organizations/:organizationId/contributions", { ...contribution, amount_minor: Number(contribution.amount_minor) })} className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-[#0C1A3D]">Record contribution</h2>
              <p className="mt-2 text-sm text-slate-500">Donation, tithe or offering receipt.</p>
              <Select label="Type" value={contribution.contribution_type} onChange={(value) => setContribution({ ...contribution, contribution_type: value })} options={["TITHE", "OFFERING", "DONATION"]} />
              <Input label="Amount in minor units" value={contribution.amount_minor} onChange={(value) => setContribution({ ...contribution, amount_minor: value })} type="number" />
              <Input label="Currency" value={contribution.currency} onChange={(value) => setContribution({ ...contribution, currency: value.toUpperCase() })} />
              <button disabled={busy} className="mt-5 rounded-xl bg-[#0C1A3D] px-4 py-3 font-semibold text-white disabled:opacity-50">Save contribution</button>
            </form>

            <form onSubmit={(event) => submit(event, "/v1/finance/organizations/:organizationId/staff", { ...staff, base_salary_minor: Number(staff.base_salary_minor) })} className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-[#0C1A3D]">Add staff member</h2>
              <p className="mt-2 text-sm text-slate-500">Store compensation data for payroll preparation.</p>
              <Input label="Legal name" value={staff.legal_name} onChange={(value) => setStaff({ ...staff, legal_name: value })} />
              <Input label="Employee number" value={staff.employee_number} onChange={(value) => setStaff({ ...staff, employee_number: value })} />
              <Input label="Department" value={staff.department} onChange={(value) => setStaff({ ...staff, department: value })} />
              <Input label="Base salary in minor units" value={staff.base_salary_minor} onChange={(value) => setStaff({ ...staff, base_salary_minor: value })} type="number" />
              <button disabled={busy} className="mt-5 rounded-xl bg-[#0C1A3D] px-4 py-3 font-semibold text-white disabled:opacity-50">Save staff member</button>
            </form>

            <form onSubmit={(event) => submit(event, "/v1/finance/organizations/:organizationId/payroll-runs", { ...payroll, deductions_minor: Number(payroll.deductions_minor) })} className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-[#0C1A3D]">Prepare payroll</h2>
              <p className="mt-2 text-sm text-slate-500">Creates payslip items and sends the run for approval.</p>
              <Input label="Period start" value={payroll.period_start} onChange={(value) => setPayroll({ ...payroll, period_start: value })} type="date" />
              <Input label="Period end" value={payroll.period_end} onChange={(value) => setPayroll({ ...payroll, period_end: value })} type="date" />
              <Input label="Currency" value={payroll.currency} onChange={(value) => setPayroll({ ...payroll, currency: value.toUpperCase() })} />
              <Input label="Total deductions in minor units" value={payroll.deductions_minor} onChange={(value) => setPayroll({ ...payroll, deductions_minor: value })} type="number" />
              <button disabled={busy} className="mt-5 rounded-xl bg-[#D4AF37] px-4 py-3 font-semibold text-[#0C1A3D] disabled:opacity-50">Create payroll run</button>
            </form>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#0C1A3D]">Staff and payslip register</h2>
            <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Staff</th><th className="p-3">Employee no.</th><th className="p-3">Department</th><th className="p-3">Base salary</th><th className="p-3">Method</th></tr></thead><tbody>{summary.staff.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="p-3 font-semibold text-[#0C1A3D]">{item.legal_name}</td><td className="p-3">{item.employee_number}</td><td className="p-3">{item.department || "—"}</td><td className="p-3">{money(item.base_salary_minor, item.currency)}</td><td className="p-3">{item.payment_method}</td></tr>)}</tbody></table>{!summary.staff.length && <p className="p-5 text-slate-500">No staff members registered.</p>}</div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#0C1A3D]">Payroll runs and payment status</h2>
            <div className="mt-5 space-y-4">{summary.payrollRuns.map((run) => <div key={run.id} className="rounded-2xl border border-slate-200 p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-semibold text-[#0C1A3D]">{run.period_start} → {run.period_end}</p><p className="mt-1 text-sm text-slate-500">Net: {money(run.total_net_minor, run.currency)} · {run.currency}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{run.status}</span></div><div className="mt-4 flex flex-wrap gap-3">{run.status === "PENDING_APPROVAL" && <button onClick={() => action(`/v1/finance/payroll-runs/${run.id}/approve`, "PATCH")} className="rounded-lg bg-[#0C1A3D] px-3 py-2 text-sm font-semibold text-white">Approve payroll</button>}{run.status === "APPROVED" && <button onClick={() => { const reference = window.prompt("External payment reference"); if (reference) void action(`/v1/finance/payroll-runs/${run.id}/settle`, "PATCH", { external_reference: reference }); }} className="rounded-lg bg-[#D4AF37] px-3 py-2 text-sm font-semibold text-[#0C1A3D]">Record payment settlement</button>}<button onClick={() => void viewPayslips(run.id)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">View payslips</button></div></div>)}{!summary.payrollRuns.length && <p className="p-5 text-slate-500">No payroll runs created.</p>}</div>
            {!!payslips.length && <div className="mt-6 overflow-x-auto"><h3 className="mb-3 font-semibold text-[#0C1A3D]">Payslip items</h3><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Payslip</th><th className="p-3">Staff ID</th><th className="p-3">Gross</th><th className="p-3">Deductions</th><th className="p-3">Net</th><th className="p-3">Status</th></tr></thead><tbody>{payslips.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="p-3 font-semibold">{item.payslip_number}</td><td className="p-3">{item.staff_id}</td><td className="p-3">{item.gross_minor}</td><td className="p-3">{item.deductions_minor}</td><td className="p-3">{item.net_minor}</td><td className="p-3">{item.status}</td></tr>)}</tbody></table></div>}
          </section>
        </>}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-white p-6 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-[#0C1A3D]">{value}</p></div>; }
function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="mt-4 block text-sm font-semibold text-slate-700">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal" required /></label>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) { return <label className="mt-4 block text-sm font-semibold text-slate-700">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal">{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
