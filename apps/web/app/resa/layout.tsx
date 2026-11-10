import ResaNavigation from "@/components/resa/core/ResaNavigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ResaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 top-24 h-[28rem] w-[28rem] rounded-full bg-sky-200/20 blur-3xl" />
        <div className="absolute right-[-10rem] top-[32rem] h-[30rem] w-[30rem] rounded-full bg-indigo-200/15 blur-3xl" />
      </div>
      <ResaNavigation />
      <div className="mx-auto max-w-[1600px] px-3 pb-28 pt-5 sm:px-6 lg:ml-[104px] lg:px-8 lg:pb-10 lg:pt-7">
        {children}
      </div>
    </div>
  );
}
