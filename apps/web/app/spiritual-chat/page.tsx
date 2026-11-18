import SpiritualChat from "@/components/spiritual-chat/SpiritualChat";

export const metadata = {
  title: "Assistente espiritual | ZION",
  description: "Estudo bíblico contextual e apoio espiritual com inteligência artificial.",
};

export default function SpiritualChatPage() {
  return (
    <main className="min-h-screen bg-[#F4F7FA] px-3 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9A7836]">ZION · Formação e crescimento espiritual</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#102B49] sm:text-4xl">Inteligência espiritual</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Um espaço de estudo, reflexão e preparação, com respostas contextualizadas e referências para aprofundamento.</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">AI Core · contexto autorizado</span>
        </header>
        <SpiritualChat />
      </div>
    </main>
  );
}
