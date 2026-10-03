"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  {
    title: "CORE",
    items: [
      { name: "Dashboard", path: "/dashboard" },
      { name: "Module Directory", path: "/modules" },
      { name: "RESA", path: "/resa" },
      { name: "Notifications", path: "/notifications" },
    ],
  },
  {
    title: "SPIRITUAL EXPERIENCE",
    items: [
      { name: "Bible Engine", path: "/bible-engine" },
      { name: "Youth Ministry", path: "/ministry" },
      { name: "Spiritual Chat", path: "/spiritual-chat" },
    ],
  },
  {
    title: "ORGANIZATION",
    items: [
      { name: "Administration", path: "/admin" },
      { name: "Finance", path: "/finance" },
      { name: "Profile", path: "/profile" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="min-h-screen w-80 bg-[#0C1A3D] px-8 py-10 text-white">
      <div>
        <h1 className="text-4xl font-semibold tracking-wide">
          ZION<span className="text-[#D4AF37]">OS</span>
        </h1>
        <p className="mt-2 text-sm text-slate-300">Global Digital Ecosystem</p>
      </div>

      <div className="mt-10 rounded-3xl border border-white/10 bg-white/10 p-5">
        <p className="font-semibold">Edgar</p>
        <p className="mt-1 text-sm text-slate-300">Global Administrator</p>
      </div>

      <nav className="mt-10">
        {sections.map((section) => (
          <div key={section.title} className="mb-8">
            <p className="mb-4 text-xs tracking-widest text-slate-400">{section.title}</p>
            {section.items.map((item) => {
              const active = pathname === item.path || pathname.startsWith(`${item.path}/`);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`mb-2 block rounded-2xl px-5 py-3 transition-all duration-300 ${
                    active
                      ? "bg-[#D4AF37] font-semibold text-[#0C1A3D] shadow-lg"
                      : "text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
