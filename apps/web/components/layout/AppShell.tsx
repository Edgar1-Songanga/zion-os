"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import Footer from "@/components/layout/Footer";
import SessionPermissionRefresh from "@/components/auth/SessionPermissionRefresh";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isResa = pathname === "/resa" || pathname.startsWith("/resa/");

  if (isResa) {
    return <><SessionPermissionRefresh />{children}</>;
  }

  return (
    <>
    <SessionPermissionRefresh />
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </div>
    </>
  );
}
