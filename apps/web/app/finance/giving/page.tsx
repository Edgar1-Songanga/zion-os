"use client";

import { useMemo, useState, type FormEvent } from "react";
import { resaRequest } from "@/lib/resa/api";
import { OrganizationSelector, type ZionOrganization } from "@/components/organization/OrganizationSelector";

type Fund = { id: string; name: string; description?: string | null; fund_type: string };
type Receipt = { receipt_number: number; verification_hash: string; issued_at: string };
type Contribution = { id: string; amount: number; currency_code: string; status: string; payment_method: string; reference_code: string; created_at: string; fund?: { name: string } | null; receipt?: Receipt | null };
const money = (v:number) => new Intl.NumberFormat("pt-AO",{style:"currency",currency:"AOA",maximumFractionDigits:2}).format(v);
const labels:Record<string,string> = {PENDING:"A aguardar confirmação",UNDER_REVIEW:"Em verificação",CONFIRMED:"Confirmada",REJECTED:"Rejeitada"};

export default function GivingPage() {
  const [orgId,setOrgId] = useState("");
  const [org,setOrg] = useState<ZionOrganization|null>(null);
  const [funds,setFunds] = useState<Fund[]>([]);
  const [history,setHistory] = useState<Contribution[]>([]);
  const [fundId,setFundId] = useState("");
  const [amount,setAmount] = useState("");
  const [step,setStep] = useState<"form"|"review">("form");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [success,setSuccess] = useState<Contribution|null>(null);
  const selected = useMemo(()=>funds.find(f=>f.id===fundId),[funds,fundId]);
  const numericAmount = Number(amount);
  const validAmount = Number.isFinite(numericAmount) && numericAmount>0 && Math.abs(numericAmount*100-Math.round(numericAmount*100))<1e-8;

  async function refresh(id:string) {
    const [f,h] = await Promise.all([
      resaRequest<Fund[]>(`/v1/finance/organizations/${id}/giving/funds`),
      resaRequest<Contribution[]>(`/v1/finance/organizations/${id}/giving/contributions`),
    ]);
    setFunds(f); setHistory(h); setFundId(current=>f.some(x=>x.id===current)?current:f[0]?.id??"");
  }
  function load(id:string,organization:ZionOrganization) {
    setOrgId(id);setOrg(organization);setError("");setSuccess(null);
    void refresh(id).catch(e=>setError(e instanceof Error?e.message:"Não foi possível carregar as contribuições."));
  }
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(step==="form"){setStep("review");return;}
    if(!orgId||!fundId||!validAmount||busy)return;
    setBusy(true);setError("");
    try {
      const item=await resaRequest<Contribution>(`/v1/finance/organizations/${orgId}/giving/contributions`,{method:"POST",body:JSON.stringify({fund_id:fundId,amount:numericAmount,payment_method:"BANK_TRANSFER"})});
      setSuccess({...item,fund:{name:selected?.name??"Contribuição"}});setStep("form");setAmount("");
      await refresh(orgId);
    } catch(e) {setError(e instanceof Error?e.message:"Não foi possível registar o pedido.");}
    finally {setBusy(false);}
  }
  function printReceipt(item:Contribution) {
    if(!item.receipt)return;
    const w=window.open("","_blank","width=720,height=800");
    if(!w){setError("Permita abrir uma janela para imprimir o recibo.");return;} w.opener=null;
    const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c] as string));
    w.document.write(`<!doctype html><html lang="pt"><meta charset="utf-8"><title>Recibo ZION #${item.receipt.receipt_number}</title><style>body{font:16px Arial,sans-serif;color:#142342;padding:42px;max-width:680px;margin:auto}header{border-bottom:3px solid #c6a45d;padding-bottom:20px}small{color:#777;letter-spacing:2px}h1{font-size:28px}dl{display:grid;grid-template-columns:180px 1fr;gap:14px}dt{color:#666}dd{margin:0;font-weight:600}.amount{font-size:28px;color:#96752d;margin:28px 0}.hash{word-break:break-all;background:#f4f2ec;padding:14px;border-radius:8px;font-size:11px}footer{margin-top:40px;color:#777;font-size:12px}@media print{button{display:none}}</style><header><small>ZION OS · RECIBO DIGITAL</small><h1>Recibo de contribuição #${item.receipt.receipt_number}</h1><p>Documento emitido após confirmação pela tesouraria.</p></header><p class="amount">${esc(money(Number(item.amount)))}</p><dl><dt>Destino</dt><dd>${esc(item.fund?.name??"Contribuição")}</dd><dt>Referência</dt><dd>${esc(item.reference_code)}</dd><dt>Data de emissão</dt><dd>${esc(new Date(item.receipt.issued_at).toLocaleString("pt-AO"))}</dd><dt>Estado</dt><dd>Confirmada</dd></dl><h3>Verificação</h3><div class="hash">${esc(item.receipt.verification_hash)}</div><footer>Guarde este documento para os seus registos. A confirmação corresponde aos dados registados no ZION OS.</footer><button onclick="window.print()">Imprimir / Guardar PDF</button></html>`);
    w.document.close();
  }

  return <main className="min-h-screen bg-[#f5f3ed] px-4 py-5 text-[#142342] sm:px-6 sm:py-8"><div className="mx-auto max-w-5xl">
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#142342] text-xl text-[#d9bd79]">✦</div><div><p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#9b7b37]">ZION · GENEROSIDADE</p><h1 className="text-2xl font-semibold sm:text-3xl">Contribuições</h1></div></div><div className="max-w-full"><OrganizationSelector value={orgId} onChange={load}/></div></header>
    <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#142b50] to-[#09162e] p-6 text-white shadow-xl sm:p-9"><div className="absolute -right-10 -top-14 h-56 w-56 rounded-full border border-white/10"/><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#d9bd79]">Generosidade com propósito</p><h2 className="mt-3 max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">Contribuir deve ser <span className="text-[#d9bd79]">simples.</span></h2><p className="mt-3 max-w-lg text-sm leading-6 text-slate-300">Escolha o destino, indique o valor e acompanhe a confirmação. O recibo fica disponível aqui assim que a tesouraria confirmar o recebimento.</p></section>
    {error&&<p role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {success&&<section className="mt-5 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm"><p className="font-semibold text-emerald-800">Pedido registado com sucesso</p><p className="mt-1 text-sm text-slate-600">Referência: <strong>{success.reference_code}</strong></p><p className="mt-1 text-sm text-slate-600">Estado: aguarda confirmação do recebimento pela tesouraria.</p><p className="mt-2 text-xs text-slate-500">Use os dados bancários oficiais fornecidos pela sua igreja. Não envie dinheiro para contas que não tenham sido confirmadas pela tesouraria.</p></section>}
    <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><form onSubmit={submit} className="rounded-[26px] border border-[#e7e2d6] bg-white p-5 shadow-sm sm:p-7"><div className="mb-5 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f5f0e3] text-sm font-semibold text-[#96752d]">01</span><div><h3 className="font-semibold">Nova contribuição</h3><p className="text-xs text-slate-500">Só precisa de três escolhas</p></div></div>
    <label className="mb-2 block text-sm font-medium">Para onde vai a contribuição?</label><div className="grid gap-2 sm:grid-cols-2">{funds.map(f=><button type="button" key={f.id} onClick={()=>setFundId(f.id)} className={`rounded-2xl border p-3 text-left transition ${fundId===f.id?"border-[#b89a55] bg-[#fbf7eb] ring-1 ring-[#b89a55]":"border-slate-200 hover:border-slate-300"}`}><span className="block text-sm font-semibold">{f.name}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{f.description}</span></button>)}</div>
    {!funds.length&&<p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Os destinos serão apresentados quando a base de dados Giving estiver ativa para esta organização.</p>}
    <label htmlFor="giving-amount" className="mb-2 mt-5 block text-sm font-medium">Valor (Kz)</label><div className="flex items-center rounded-2xl border border-slate-200 bg-[#fbfbfa] px-4 py-3 focus-within:border-[#b89a55]"><span className="mr-3 text-sm font-semibold text-slate-400">AOA</span><input id="giving-amount" type="number" inputMode="decimal" min="1" step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0,00" className="w-full bg-transparent text-2xl font-semibold outline-none placeholder:text-slate-300"/></div><div className="mt-3 flex flex-wrap gap-2">{[1000,2500,5000,10000].map(v=><button type="button" key={v} onClick={()=>setAmount(String(v))} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:border-[#b89a55]">{new Intl.NumberFormat("pt-AO").format(v)} Kz</button>)}</div>
    <div className="mt-5 rounded-2xl border border-slate-200 p-4"><p className="text-sm font-semibold">Transferência bancária</p><p className="mt-1 text-xs leading-5 text-slate-500">Depois de registar o pedido, confirme os dados bancários oficiais com a tesouraria. A referência permite identificar o pedido; não substitui a confirmação do banco.</p><p className="mt-3 text-xs font-medium text-amber-700">Multicaixa Express ficará disponível quando a integração autorizada estiver configurada.</p></div>
    {step==="review"&&<div className="mt-4 rounded-2xl bg-[#f7f5ef] p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Confirme antes de enviar</p><p className="mt-2 text-xl font-semibold">{money(numericAmount)}</p><p className="text-sm text-slate-600">{selected?.name} · Transferência bancária</p><p className="mt-2 text-xs leading-5 text-slate-500">Este pedido não é um comprovativo de pagamento. O recibo só será emitido após confirmação da tesouraria.</p></div>}
    <div className="mt-5 flex gap-3">{step==="review"&&<button type="button" onClick={()=>setStep("form")} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold">Voltar</button>}<button disabled={!orgId||!fundId||!validAmount||!funds.length||busy} className="flex-1 rounded-xl bg-[#142342] px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-40">{busy?"A registar…":step==="form"?"Rever contribuição →":"Confirmar pedido"}</button></div>
    </form><aside className="space-y-4"><section className="rounded-[26px] border border-[#e7e2d6] bg-white p-5 sm:p-6"><h3 className="font-semibold">Como funciona</h3><div className="mt-4 space-y-4">{[["01","Escolha","Selecione dízimo, construção, ofertas ou um ministério."],["02","Registe","Indique o valor e guarde a referência do pedido."],["03","Confirmação","A tesouraria valida o recebimento e o sistema emite o recibo."]].map(([n,t,d])=><div key={n} className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#f5f0e3] text-xs font-semibold text-[#96752d]">{n}</span><div><p className="text-sm font-semibold">{t}</p><p className="mt-1 text-xs leading-5 text-slate-500">{d}</p></div></div>)}</div></section><section className="rounded-[26px] bg-[#eeece5] p-5"><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#927538]">Privacidade e confiança</p><p className="mt-2 text-sm leading-6 text-slate-600">O seu histórico é privado. Nenhum recibo é emitido para um pagamento ainda não confirmado.</p></section></aside></div>
    <section className="mt-8"><div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#9b7b37]">Área pessoal</p><h2 className="mt-1 text-xl font-semibold">Histórico e recibos</h2></div><span className="text-xs text-slate-500">{history.length} registo(s)</span></div><div className="overflow-hidden rounded-[24px] border border-[#e7e2d6] bg-white">{history.map(item=><article key={item.id} className="flex items-center justify-between gap-4 border-b border-slate-100 p-4 last:border-0 sm:p-5"><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.fund?.name??"Contribuição"}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.created_at).toLocaleDateString("pt-AO")} · {item.reference_code}</p><p className={`mt-2 text-xs font-medium ${item.status==="CONFIRMED"?"text-emerald-700":item.status==="REJECTED"?"text-red-700":"text-amber-700"}`}>{labels[item.status]??item.status}</p></div><div className="shrink-0 text-right"><p className="text-sm font-semibold">{money(Number(item.amount))}</p>{item.receipt&&<button type="button" onClick={()=>printReceipt(item)} className="mt-2 rounded-lg bg-[#142342] px-3 py-2 text-xs font-semibold text-white">Recibo · PDF</button>}</div></article>)}{!history.length&&<p className="p-6 text-center text-sm text-slate-500">As suas contribuições aparecerão aqui.</p>}</div></section><footer className="py-7 text-center text-xs text-slate-400">ZION OS · Generosidade com transparência</footer>
  </div></main>;
}
