"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/components/i18n";

function NavIcon({ index }: { index: number }) {
  const paths = [
    "M3 10.5 12 3l9 7.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-8Z",
    "M12 3v18M3 12h18",
    "M4 5h16v14H4z M8 9h8 M8 13h5",
    "M5 20a7 7 0 0 1 14 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    "M4 5h16v15H4z M8 2v6M16 2v6M4 10h16",
    "M12 21s-7-4.35-7-10V5l7-3 7 3v6c0 5.65-7 10-7 10Z",
    "M4 18h16M6 18V9M10 18V5M14 18v-7M18 18V7",
    "M12 3v18M3 12h18",
    "M5 5h14v14H5z M8 9h8 M8 13h5",
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  ];
  const path = paths[index % paths.length];
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const sections = [
    { title: t("core"), items: [{ name: t("dashboard"), path: "/dashboard" }, { name: t("resa"), path: "/resa" }] },
    {
      title: t("spiritualExperience"),
      items: [
        { name: t("spiritualVision"), path: "/spiritual-experience" },
        { name: t("bibleEngine"), path: "/bible-engine" },
        { name: t("prayer"), path: "/resa/prayer" },
        { name: t("devotion"), path: "/devotion" },
        { name: t("spiritualGrowth"), path: "/spiritual-growth" },
        { name: t("sabbathSchool"), path: "/sabbath-school" },
        { name: t("adventistSources"), path: "/adventist-canon" },
        { name: t("ministry"), path: "/ministry" },
        { name: t("spiritualChat"), path: "/spiritual-chat" },
        { name: t("communities"), path: "/communities" },
      ],
    },
    {
      title: t("organization"),
      items: [
        { name: t("administration"), path: "/admin" },
        { name: t("finance"), path: "/finance" },
        { name: t("reports"), path: "/reports" },
      ],
    },
  ];

  return (
    <aside className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-[linear-gradient(180deg,#0B2D4D_0%,#071E35_100%)] px-4 py-5 text-white shadow-[8px_0_30px_rgba(7,30,53,0.10)]">
      <div className="px-3">
        <h1 className="text-[25px] font-semibold tracking-[0.24em] text-white">
          ZION<span className="text-[#C8A24A]">OS</span>
        </h1>
        <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-300">
          {t("globalDigitalEcosystem")}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.07] p-3.5 shadow-inner">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-sm font-semibold text-[#E0B85A]">E</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Edgar</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-300">{t("globalAdministrator")}</p>
          </div>
        </div>
      </div>

      <nav className="mt-6 flex-1">
        {sections.map((section, sectionIndex) => (
          <div key={section.title} className="mb-5">
            <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item, itemIndex) => {
                const active = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={[
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all duration-200",
                      active
                        ? "bg-white text-[#0B2D4D] shadow-[0_6px_18px_rgba(0,0,0,0.12)]"
                        : "text-slate-200 hover:bg-white/[0.08] hover:text-white",
                    ].join(" ")}
                  >
                    <span className={active ? "text-[#C8A24A]" : "text-slate-400 group-hover:text-[#E0B85A]"}>
                      <NavIcon index={sectionIndex * 3 + itemIndex} />
                    </span>
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
