"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import Footer from "@/components/layout/Footer";
import SessionPermissionRefresh from "@/components/auth/SessionPermissionRefresh";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isResa = pathname === "/resa" || pathname.startsWith("/resa/");
  const isPublicEntry = pathname === "/" || pathname === "/auth" || pathname.startsWith("/auth/") || pathname === "/church-registration";

  // Public entry and authentication pages stay outside the private dashboard shell.
  if (isResa || isPublicEntry) {
    return <><SessionPermissionRefresh />{children}</>;
  }

  return (
    <>
    <SessionPermissionRefresh />
    <div className="flex h-dvh min-h-0 overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} />
      <div className="flex h-dvh min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarCollapsed((value) => !value)} sidebarCollapsed={sidebarCollapsed} />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-0">
          {children}
          <Footer />
        </main>
      </div>
    </div>
    </>
  );
}
