"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";

type Visibility = "public" | "friends" | "friends_of_friends" | "private";
type Privacy = {
  profile_visibility: Visibility;
  bio_visibility: Visibility;
  country_visibility: Visibility;
  timezone_visibility: Visibility;
};

const defaults: Privacy = {
  profile_visibility: "friends",
  bio_visibility: "friends",
  country_visibility: "friends",
  timezone_visibility: "private",
};

const options: Array<{value: Visibility; label: string; detail: string}> = [
  { value: "public", label: "Público", detail: "Qualquer pessoa autenticada pode ver." },
  { value: "friends", label: "Amigos", detail: "Apenas ligações recíprocas: ambos seguem um ao outro." },
  { value: "friends_of_friends", label: "Amigos dos amigos", detail: "Amigos e pessoas ligadas através de um amigo em comum." },
  { value: "private", label: "Privado", detail: "Só tu vês os dados do perfil; os outros recebem apenas identificação mínima." },
];

export default function ProfilePrivacyPage() {
  const [privacy, setPrivacy] = useState<Privacy>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    resaRequest<{privacy?: Partial<Privacy>}>("/v1/identity/profile")
      .then((profile) => setPrivacy((current) => ({...current, ...(profile.privacy ?? {})})))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Não foi possível carregar as preferências."))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true); setNotice(""); setError("");
    try {
      await resaRequest("/v1/identity/profile", {
        method: "PATCH",
        body: JSON.stringify({privacy}),
      });
      setNotice("Preferências de visibilidade guardadas.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível guardar as preferências.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--zion-light)] p-5 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="rounded-3xl bg-[var(--zion-primary)] p-7 text-white shadow-[var(--zion-shadow-lg)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">RESA · CONTA</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Visibilidade do perfil</h1>
          <p className="mt-2 text-sm text-white/70">Escolhe quem pode consultar cada parte do teu perfil.</p>
        </header>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}
        <section className="rounded-2xl border border-[var(--zion-border)] bg-white p-6 shadow-[var(--zion-shadow-sm)]">
          {loading ? <p className="text-sm text-[var(--zion-muted)]">A carregar preferências…</p> : (
            <div className="space-y-5">
              {([
                ["profile_visibility","Quem pode ver o perfil"],
                ["bio_visibility","Quem pode ver a biografia"],
                ["country_visibility","Quem pode ver o país"],
                ["timezone_visibility","Quem pode ver o fuso horário"],
              ] as const).map(([key,label]) => (
                <label key={key} className="block rounded-xl border border-[var(--zion-border)] bg-[var(--zion-light)] p-4">
                  <span className="block text-sm font-semibold text-[var(--zion-dark)]">{label}</span>
                  <select value={privacy[key]} onChange={(event)=>setPrivacy((current)=>({...current,[key]:event.target.value as Visibility}))} className="mt-3 w-full rounded-lg border border-[var(--zion-border)] bg-white px-3 py-3 text-sm">
                    {options.map((option)=><option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <span className="mt-2 block text-xs text-[var(--zion-muted)]">{options.find((option)=>option.value===privacy[key])?.detail}</span>
                </label>
              ))}
              <div className="rounded-xl border border-[var(--zion-border)] p-4 text-sm text-[var(--zion-muted)]">
                <strong className="text-[var(--zion-dark)]">Como o RESA define amigos:</strong> uma amizade corresponde a seguimento recíproco. Seguir alguém sem ser seguido de volta não concede acesso ao nível “Amigos”.
              </div>
              <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-[var(--zion-primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "A guardar…" : "Guardar preferências"}</button>
            </div>
          )}
        </section>
        <Link href="/account" className="inline-flex rounded-xl border border-[var(--zion-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--zion-dark)]">Voltar à conta</Link>
      </div>
    </main>
  );
}
