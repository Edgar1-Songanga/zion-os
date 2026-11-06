import { Suspense } from "react";
import ReceiptVerificationForm from "./ReceiptVerificationForm";

type PageProps = {
  searchParams: Promise<{ codigo?: string; code?: string }>;
};

export default async function VerifyReceiptPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialCode = params.codigo ?? params.code ?? "";

  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#f5f3ed] p-6 text-sm text-slate-500">A carregar verificação…</main>}>
      <ReceiptVerificationForm initialCode={initialCode} />
    </Suspense>
  );
}
