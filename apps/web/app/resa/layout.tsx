import ResaNavigation from "@/components/resa/core/ResaNavigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ResaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 top-24 h-[28rem] w-[28rem] rounded-full bg-sky-200/25 blur-3xl" />
        <div className="absolute right-[-10rem] top-[32rem] h-[30rem] w-[30rem] rounded-full bg-indigo-200/20 blur-3xl" />
        <div className="absolute bottom-[-12rem] left-1/3 h-[26rem] w-[26rem] rounded-full bg-amber-100/25 blur-3xl" />
      </div>
      <div className="mx-auto max-w-[1540px] px-3 pb-12 pt-3 sm:px-6 lg:px-8 lg:pt-5">
        <ResaNavigation />
        {children}
      </div>
    </div>
  );
}
