import Link from "next/link";
import AdminExperience from "@/components/admin/AdminExperience";
import { requireGlobalAdmin } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function Admin() {
  await requireGlobalAdmin("/admin");

  return (
    <>
      <AdminExperience />
      {true && (
        <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-8">
          <Link href="/admin/institutions" className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#C8A24A]">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Administração global verificada</p>
            <h2 className="mt-2 text-lg font-semibold text-[#0C1A3D]">Gerir hierarquia institucional</h2>
            <p className="mt-1 text-sm text-slate-600">Registar Associação Geral, Divisões, Uniões, Associações e Missões com relações hierárquicas validadas.</p>
          </Link>
        </div>
      )}
    </>
  );
}
