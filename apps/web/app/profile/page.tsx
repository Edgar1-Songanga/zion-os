"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import { createClient } from "@/lib/supabase/client";
import ResaSocialNetwork from "@/components/resa/social/ResaSocialNetwork";

type Profile = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country_code: string | null;
  locale: string;
  timezone: string;
};

const emptyProfile: Profile = {
  id: "", display_name: "", first_name: "", last_name: "", avatar_url: "",
  bio: "", country_code: "", locale: "pt", timezone: "UTC",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    Promise.all([resaRequest<Profile>("/v1/identity/profile"), supabase.auth.getUser()])
      .then(([currentProfile, userResult]) => {
        if (!active) return;
        if (userResult.error) throw userResult.error;
        setProfile({ ...emptyProfile, ...currentProfile });
        setEmail(userResult.data.user?.email ?? "");
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Não foi possível carregar o perfil.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const displayName = useMemo(
    () => profile.display_name?.trim() ||
      [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() ||
      email || "Utilizador ZION",
    [profile.display_name, profile.first_name, profile.last_name, email],
  );

  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0]?.toUpperCase()).join("");

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview("");
      return;
    }
    const previewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [avatarFile]);

  function selectAvatar(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Escolha uma imagem para a fotografia de perfil.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("A fotografia ultrapassa o limite de 5 MB.");
      return;
    }
    setError("");
    setSaved(false);
    setAvatarFile(file);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setSaved(false); setError("");
    try {
      let avatarUrl = profile.avatar_url?.trim() || null;
      if (avatarFile) {
        const supabase = createClient();
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) throw new Error("A sessão RESA não está disponível.");

        const extension = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${userData.user.id}/avatar-${crypto.randomUUID()}.${extension}`;
        const upload = await supabase.storage.from("resa-media").upload(path, avatarFile, {
          contentType: avatarFile.type,
          upsert: false,
        });
        if (upload.error) throw new Error(upload.error.message);
        avatarUrl = supabase.storage.from("resa-media").getPublicUrl(path).data.publicUrl;
      }

      const updated = await resaRequest<Profile>("/v1/identity/profile", {
        method: "PATCH",
        body: JSON.stringify({
          display_name: profile.display_name?.trim() || null,
          first_name: profile.first_name?.trim() || null,
          last_name: profile.last_name?.trim() || null,
          avatar_url: avatarUrl,
          bio: profile.bio?.trim() || null,
          country_code: profile.country_code?.trim().toUpperCase() || null,
          locale: profile.locale,
          timezone: profile.timezone,
        }),
      });
      setProfile((current) => ({ ...current, ...updated }));
      setAvatarFile(null);
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível guardar o perfil.");
    } finally { setSaving(false); }
  }

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  if (loading) return <main className="min-h-screen bg-slate-50 p-6 lg:p-10"><div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 text-slate-500">A carregar o seu perfil…</div></main>;

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-[28px] bg-[#0C1A3D] p-8 text-white shadow-xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <button type="button" onClick={() => avatarInputRef.current?.click()} className="group relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-3xl font-semibold ring-1 ring-white/20" aria-label="Alterar fotografia de perfil" title="Alterar fotografia">
              {(avatarPreview || profile.avatar_url) ? <img src={avatarPreview || profile.avatar_url || ""} alt={`Fotografia de ${displayName}`} className="h-full w-full object-cover" /> : (initials || "Z")}
              <span className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-center text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">Alterar</span>
            </button>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Perfil ZION</p>
              <h1 className="mt-2 truncate text-3xl font-semibold">{displayName}</h1>
              <p className="mt-2 break-all text-sm text-slate-300">{email || "Email não disponível"}</p>
            </div>
          </div>
        </header>

        <form onSubmit={save} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="border-b border-slate-100 pb-6">
            <h2 className="text-xl font-semibold text-[#0C1A3D]">Dados do perfil</h2>
            <p className="mt-1 text-sm text-slate-500">Dados reais associados à sua identidade ZION.</p>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Nome</span><input value={profile.first_name ?? ""} onChange={(e) => update("first_name", e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" autoComplete="given-name" /></label>
            <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Apelido</span><input value={profile.last_name ?? ""} onChange={(e) => update("last_name", e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" autoComplete="family-name" /></label>
            <label className="space-y-2 sm:col-span-2"><span className="text-sm font-medium text-slate-700">Nome de apresentação</span><input value={profile.display_name ?? ""} onChange={(e) => update("display_name", e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" maxLength={120} /></label>
            <label className="space-y-2 sm:col-span-2"><span className="text-sm font-medium text-slate-700">Biografia</span><textarea value={profile.bio ?? ""} onChange={(e) => update("bio", e.target.value)} rows={4} className="w-full resize-y rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" maxLength={500} /></label>
            <label className="space-y-2"><span className="text-sm font-medium text-slate-700">País (código ISO)</span><input value={profile.country_code ?? ""} onChange={(e) => update("country_code", e.target.value)} placeholder="AO" maxLength={2} className="w-full rounded-2xl border border-slate-200 px-4 py-3 uppercase outline-none focus:border-blue-500" autoComplete="country" /></label>
            <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Fuso horário</span><input value={profile.timezone ?? ""} onChange={(e) => update("timezone", e.target.value)} placeholder="Africa/Luanda" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" /></label>
            <div className="space-y-3 sm:col-span-2">
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-xl font-bold text-[#0C1A3D] ring-1 ring-slate-200">
                  {(avatarPreview || profile.avatar_url) ? <img src={avatarPreview || profile.avatar_url || ""} alt="" className="h-full w-full object-cover" /> : (initials || "Z")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-700">Fotografia de perfil</p>
                  <p className="mt-1 text-xs text-slate-500">Escolha uma fotografia real. JPG, PNG ou WebP até 5 MB.</p>
                </div>
                <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => selectAvatar(e.target.files?.[0])} />
                <button type="button" onClick={() => avatarInputRef.current?.click()} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">{avatarFile ? "Escolher outra" : "Alterar fotografia"}</button>
              </div>
            </div>
          </div>

          {error && <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {saved && <div role="status" className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Perfil guardado com sucesso.</div>}

          <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-medium text-slate-700">Conta</p><p className="text-xs text-slate-500">{email || "Sem email disponível"}</p></div>
            <button disabled={saving} type="submit" className="rounded-2xl bg-[#0C1A3D] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? "A guardar…" : "Guardar perfil"}</button>
          </div>
        </form>

        {profile.id && <ResaSocialNetwork userId={profile.id} />}
      </div>
    </main>
  );
}
