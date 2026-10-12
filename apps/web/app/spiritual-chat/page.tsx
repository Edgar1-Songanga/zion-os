import SpiritualChat from "@/components/spiritual-chat/SpiritualChat";

export default function SpiritualChatPage() {
  return (
    <main className="min-h-screen bg-[#F4F6FA] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9B7A34]">ZION OS · Experiência espiritual</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#0C1A3D] sm:text-4xl">Estudo bíblico e reflexão</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">Um ambiente sereno para formular perguntas, consultar passagens e aprofundar o estudo das Escrituras.</p>
          </div>
          <div className="w-fit rounded-2xl border border-[#D9BD78]/40 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Orientação</p>
            <p className="mt-1 text-sm font-semibold text-[#0C1A3D]">Referências verificáveis</p>
          </div>
        </header>
        <SpiritualChat />
        <p className="mx-auto mt-5 max-w-6xl text-xs leading-5 text-slate-500">As respostas são um apoio ao estudo e não substituem a leitura contextual das Escrituras nem a orientação pastoral. Confirme sempre as referências apresentadas.</p>
      </div>
    </main>
  );
}
