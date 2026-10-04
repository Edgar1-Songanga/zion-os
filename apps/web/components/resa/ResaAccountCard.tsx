"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ResaIcon from "./core/ResaIcon";

export default function ResaAccountCard() {
  const [email, setEmail] = useState("Utilizador RESA");
  const [initial, setInitial] = useState("R");

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      const value = data.user?.email?.trim();
      if (!value) return;
      setEmail(value);
      setInitial(value.charAt(0).toUpperCase());
    });
  }, []);

  return (
    <section className="relative overflow-hidden rounded-[28px] bg-[#0C1A3D] p-6 text-white shadow-[0_20px_50px_rgba(12,26,61,0.16)]">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-400/15 blur-2xl" />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">A sua presença</p>
        <div className="mt-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-lg font-semibold">{initial}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{email}</p>
            <p className="mt-1 text-xs text-slate-400">Membro da comunidade RESA</p>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
          <ResaIcon name="users" size={16} />
          Ligado à rede global
        </div>
      </div>
    </section>
  );
}
