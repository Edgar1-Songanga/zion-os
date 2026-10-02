import MinistryLivePage from "@/components/ministry/MinistryLivePage";

export default function MinistryPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">
        <MinistryLivePage ministryId="ministry-youth-001" />
      </div>
    </main>
  );
}
