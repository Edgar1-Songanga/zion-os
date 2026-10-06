"use client";

import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import ResaIcon from "./core/ResaIcon";
import { useTranslation } from "@/components/i18n";

type Profile = {
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

export default function ResaAccountCard() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    void resaRequest<Profile>("/v1/identity/profile")
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);

  const name =
    profile?.display_name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    t("authenticatedAccount");

  const initial = name.charAt(0).toUpperCase() || "R";

  return (
    <section className="relative overflow-hidden rounded-[28px] bg-[#0C1A3D] p-6 text-white shadow-[0_20px_50px_rgba(12,26,61,0.16)]">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-400/15 blur-2xl" />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t("yourPresence")}</p>
        <div className="mt-5 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-lg font-semibold">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="mt-1 text-xs text-slate-400">{t("activeResaIdentity")}</p>
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
