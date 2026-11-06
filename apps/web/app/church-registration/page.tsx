"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resaRequest } from "@/lib/resa/api";

type CreatedChurch = { id: string; name: string; slug: string; organization_type: string };

function toSlug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export default function ChurchRegistrationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [customSlug, setCustomSlug] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedChurch | null>(null);
  const suggestedSlug = useMemo(() => toSlug(name), [name]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token) {
        router.replace("/auth/sign-in?next=/church-registration");
        return;
      }
      const result = await resaRequest<CreatedChurch>("/v1/organizations", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), slug: (customSlug ? slug : suggestedSlug).trim(), organization_type: "LOCAL_CHURCH" }),
      });
      setCreated(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível registar a igreja.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F6FA] px-4 py-12 text-[#0C1A3D] sm:px-8">
      <section className="mx-auto max-w-2xl rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">ZION OS · Registo institucional</p>
        {created ? (
          <>
            <h1 className="mt-4 text-3xl font-semibold">Igreja registada</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">A organização foi criada e a tua conta ficou associada como proprietária. Os dados ficam guardados no ZION OS.</p>
            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <p className="font-semibold">{created.name}</p>
              <p className="mt-1 text-sm text-slate-500">zion-os.org/{created.slug}</p>
            </div>
            <button onClick={() => router.push("/church-administration")} className="mt-7 rounded-xl bg-[#0C1A3D] px-5 py-3 text-sm font-semibold text-white">Abrir administração da igreja</button>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Registar uma igreja</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">As contas pessoais são abertas a todos. Este formulário destina-se exclusivamente a igrejas. A hierarquia denominacional pode ser associada posteriormente por quem tenha autorização institucional.</p>
            <form onSubmit={submit} className="mt-8 space-y-5">
              <label className="block">
                <span className="text-sm font-medium">Nome da igreja</span>
                <input required maxLength={160} value={name} onChange={(event) => { setName(event.target.value); if (!customSlug) setSlug(toSlug(event.target.value)); }} placeholder="Ex.: Igreja Adventista do Sétimo Dia — ..." className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#0C1A3D] focus:ring-4 focus:ring-slate-900/5" />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Endereço público</span>
                <input required minLength={3} maxLength={80} pattern="[a-z0-9]+([a-z0-9-]*[a-z0-9])?" value={customSlug ? slug : suggestedSlug} onChange={(event) => { setCustomSlug(true); setSlug(toSlug(event.target.value)); }} placeholder="nome-da-igreja" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#0C1A3D] focus:ring-4 focus:ring-slate-900/5" />
                <span className="mt-2 block text-xs text-slate-500">Apenas letras sem acentos, números e hífen. Deve ser único.</span>
              </label>
              {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
              <button type="submit" disabled={loading || !name.trim()} className="w-full rounded-xl bg-[#0C1A3D] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#172c55] disabled:opacity-50">{loading ? "A registar…" : "Registar igreja"}</button>
            </form>
          </>
        )}
        <p className="mt-7 text-sm text-slate-500"><Link href="/dashboard" className="font-semibold text-[#0C1A3D] underline underline-offset-4">Voltar ao ZION OS</Link></p>
      </section>
    </main>
  );
}
