"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import ResaIcon from "./core/ResaIcon";
import { useTranslation } from "@/components/i18n";

type DiscoveryItem = {
  id: string;
  title?: string | null;
  body?: string | null;
  type?: string | null;
  created_at?: string;
};

export default function CommunityCard() {
  const { t } = useTranslation();
  const [items, setItems] = useState<DiscoveryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void resaRequest<DiscoveryItem[]>("/v1/resa/explore?limit=3")
      .then((data) => setItems(data.slice(0, 3)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{t("discover")}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#0C1A3D]">{t("networkActivity")}</h2>
        </div>
        <Link
          href="/resa/explore"
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-[#0C1A3D]"
          aria-label={t("exploreResa")}
        >
          <ResaIcon name="search" size={17} />
        </Link>
      </div>

      <div className="mt-5 space-y-2">
        {loading &&
          [1, 2, 3].map((item) => (
            <div key={item} className="animate-pulse rounded-2xl p-3">
              <div className="h-4 w-2/3 rounded bg-slate-100" />
              <div className="mt-2 h-3 w-full rounded bg-slate-100" />
            </div>
          ))}

        {!loading && items.map((item) => (
          <Link
            key={item.id}
            href="/resa/explore"
            className="group block rounded-2xl p-3 transition hover:bg-slate-50"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#0C1A3D] group-hover:bg-[#0C1A3D] group-hover:text-white">
                <ResaIcon name={item.type === "story" ? "story" : "sparkles"} size={17} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-700">
                  {item.title || t("networkPost")}
                </p>
                {item.body && (
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.body}</p>
                )}
              </div>
            </div>
          </Link>
        ))}

        {!loading && items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            Ainda não existem conteúdos públicos para descobrir.
          </div>
        )}
      </div>
    </section>
  );
}
