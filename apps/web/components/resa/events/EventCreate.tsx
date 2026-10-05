"use client";

import { useState } from "react";
import { resaRequest } from "@/lib/resa/api";

export default function EventCreate() {
  const [title,setTitle]=useState(""); const [description,setDescription]=useState(""); const [date,setDate]=useState("");
  const [location,setLocation]=useState(""); const [status,setStatus]=useState<"idle"|"saving"|"success"|"error">("idle"); const [message,setMessage]=useState("");

  async function createEvent() {
    if(title.trim().length<2 || !date){setStatus("error");setMessage("Título e data são obrigatórios.");return;}
    setStatus("saving");setMessage("");
    try { await resaRequest("/v1/resa/events",{method:"POST",body:JSON.stringify({title:title.trim(),description:description.trim()||null,starts_at:new Date(date).toISOString(),location:location.trim()||null,visibility:"public"})}); setStatus("success");setMessage("Evento criado.");setTitle("");setDescription("");setDate("");setLocation(""); }
    catch(e){setStatus("error");setMessage(e instanceof Error?e.message:"Não foi possível criar o evento.");}
  }
  return <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">RESA · Eventos</p><h2 className="mt-2 text-2xl font-semibold text-[#0C1A3D]">Criar evento</h2>
    <div className="mt-6 grid gap-4"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título do evento" className="rounded-2xl border border-slate-200 px-4 py-3"/><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Descrição" rows={4} className="rounded-2xl border border-slate-200 px-4 py-3"/><div className="grid gap-4 sm:grid-cols-2"><input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3"/><input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Local ou endereço" className="rounded-2xl border border-slate-200 px-4 py-3"/></div></div>
    {message&&<p role={status==="error"?"alert":"status"} className={`mt-4 rounded-2xl p-3 text-sm ${status==="error"?"bg-red-50 text-red-700":"bg-emerald-50 text-emerald-700"}`}>{message}</p>}
    <button disabled={status==="saving"} onClick={()=>void createEvent()} className="mt-5 rounded-2xl bg-[#0C1A3D] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">{status==="saving"?"A criar…":"Criar evento"}</button>
  </section>;
}