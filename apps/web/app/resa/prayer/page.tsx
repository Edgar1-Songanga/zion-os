"use client";

import { useState } from "react";
import ResaIcon from "@/components/resa/core/ResaIcon";
import PrayerRequestForm from "@/components/resa/prayer/PrayerRequestForm";
import PrayerFeed from "@/components/resa/prayer/PrayerFeed";
import PrayerActions from "@/components/resa/prayer/PrayerActions";

export default function PrayerCenter() {
  const [refreshKey,setRefreshKey]=useState(0);
  return <main className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl">
    <section className="relative overflow-hidden rounded-[30px] bg-[#08152f] p-6 text-white shadow-[0_20px_60px_rgba(8,21,47,0.16)] sm:p-8">
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl"/><div className="absolute -bottom-24 left-1/2 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl"/>
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07]"><ResaIcon name="prayer" size={21}/></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Rede global de intercessão</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Oração</h1></div></div><p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-[15px]">Um espaço seguro para apresentar pedidos, interceder por outras pessoas e acompanhar respostas — com privacidade, reverência e dados reais.</p></div></div>
    </section>
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)_320px]"><PrayerRequestForm onCreated={()=>setRefreshKey(v=>v+1)}/><PrayerFeed refreshKey={refreshKey}/><PrayerActions/></div>
  </div></main>;
}
