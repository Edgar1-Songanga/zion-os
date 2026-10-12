import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardExperience from "@/components/dashboard/DashboardExperience";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const destinations = [
  {
    eyebrow: "APRENDER",
    title: "Bible Challenge",
    description: "Explora as Escrituras, responde a perguntas e consolida o que aprendeste.",
    href: "/bible-engine#bible-challenge",
    action: "Continuar a jornada",
    number: "01",
  },
  {
    eyebrow: "REFLETIR",
    title: "Estudo e devoção",
    description: "Reserva um momento para ler, refletir e registar o que levas contigo.",
    href: "/devotion",
    action: "Abrir devoção",
    number: "02",
  },
  {
    eyebrow: "PERTENCER",
    title: "Comunidade",
    description: "Descobre conversas, partilha experiências e cresce com outras pessoas.",
    href: "/resa/communities",
    action: "Encontrar comunidade",
    number: "03",
  },
  {
    eyebrow: "ORAR",
    title: "Oração",
    description: "Encontra um espaço para pedidos de oração, intercessão e apoio mútuo.",
    href: "/resa/prayer",
    action: "Entrar no espaço de oração",
    number: "04",
  },
  {
    eyebrow: "ESTUDAR EM CONJUNTO",
    title: "Escola Sabatina",
    description: "Aprofunda temas bíblicos e acompanha a aprendizagem em comunidade.",
    href: "/sabbath-school",
    action: "Explorar estudos",
    number: "05",
  },
  {
    eyebrow: "CRESCER",
    title: "Jornada espiritual",
    description: "Consulta os espaços de acompanhamento e reflexão da tua caminhada.",
    href: "/spiritual-growth",
    action: "Ver jornada",
    number: "06",
  },
] as const;

export default async function Dashboard() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    redirect("/auth/sign-in?next=/dashboard");
  }

  return (
    <DashboardExperience>
      <div className="mx-auto max-w-[1440px] space-y-7 pb-8">
        <section className="relative isolate overflow-hidden rounded-[30px] bg-[#07152B] px-6 py-9 text-white shadow-[0_28px_90px_rgba(7,21,43,0.18)] sm:px-10 sm:py-12 lg:px-14 lg:py-14">
          <div
            aria-hidden="true"
            className="absolute inset-0 z-0 bg-cover bg-center opacity-35"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1800&q=85')" }}
          />
          <div aria-hidden="true" className="absolute inset-0 z-[1] bg-[linear-gradient(105deg,rgba(5,15,32,0.98)_0%,rgba(7,21,43,0.88)_56%,rgba(7,21,43,0.52)_100%)]" />
          <div aria-hidden="true" className="absolute -right-24 -top-28 h-80 w-80 rounded-full border border-[#E2C477]/20" />
          <div aria-hidden="true" className="absolute -right-8 -top-12 h-48 w-48 rounded-full border border-white/10" />
          <div className="relative max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#E2C477]">ZION OS · A TUA JORNADA</p>
            <h1 className="mt-5 max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-5xl lg:text-6xl">
              Um lugar para aprender, pertencer e crescer.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-200 sm:text-base sm:leading-8">
              Encontra inspiração nas Escrituras, aprende ao teu ritmo e transforma boas ideias em gestos concretos na tua vida e comunidade.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/bible-engine#bible-challenge" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#E2C477] px-6 py-3 text-sm font-semibold text-[#07152B] shadow-[0_8px_28px_rgba(226,196,119,0.18)] transition hover:-translate-y-0.5 hover:bg-[#F0D99A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                Começar uma jornada bíblica <span aria-hidden="true" className="ml-2">↗</span>
              </Link>
              <Link href="/resa/communities" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/[0.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                Descobrir a comunidade
              </Link>
            </div>
          </div>
          <div className="relative mt-10 grid gap-3 border-t border-white/15 pt-5 text-xs text-slate-300 sm:grid-cols-3 sm:gap-5 sm:pt-6">
            <p className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#E2C477]" /> Aprende com contexto e referências</p>
            <p className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#E2C477]" /> Avança ao teu próprio ritmo</p>
            <p className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#E2C477]" /> Cresce em comunidade</p>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="relative overflow-hidden rounded-[26px] border border-slate-200/80 bg-white p-6 shadow-[0_10px_34px_rgba(15,23,42,0.045)] sm:p-8">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">
              <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FBF6E8] text-base">✦</span>
              Um próximo passo possível
            </div>
            <h2 className="mt-5 max-w-lg text-2xl font-semibold tracking-tight text-[#0C1A3D] sm:text-3xl">Pensa no que merece ocupar a tua atenção.</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
              Leitura sugerida: <strong className="font-semibold text-[#0C1A3D]">Filipenses 4:8</strong>. Lê a passagem com calma e pergunta a ti próprio: que pensamento bom posso alimentar e pôr em prática hoje?
            </p>
            <Link href="/bible-engine" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0C1A3D] underline decoration-[#D4AF37] decoration-2 underline-offset-4 hover:text-[#8B6F16]">
              Abrir o Bible Engine <span aria-hidden="true">→</span>
            </Link>
          </article>

          <article className="flex flex-col justify-between rounded-[26px] border border-[#10264B] bg-[#0B1C38] p-6 text-white shadow-[0_18px_48px_rgba(7,21,43,0.12)] sm:p-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#E2C477]">Uma experiência, muitos caminhos</p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">A tua fé também cresce em comunidade.</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">Partilha uma reflexão, acompanha uma conversa ou encontra um espaço onde possas aprender com outras pessoas.</p>
            </div>
            <Link href="/resa/communities" className="mt-7 inline-flex min-h-11 w-fit items-center justify-center rounded-full border border-white/20 bg-white/[0.07] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.13]">
              Entrar na comunidade <span aria-hidden="true" className="ml-2">↗</span>
            </Link>
          </article>
        </section>

        <section aria-labelledby="journey-destinations-title">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">Explora a Zion</p>
              <h2 id="journey-destinations-title" className="mt-2 text-2xl font-semibold tracking-tight text-[#0C1A3D] sm:text-3xl">Escolhe o teu próximo passo.</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-500">Não precisas de fazer tudo hoje. Escolhe aquilo que é útil para ti neste momento.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {destinations.map((item) => (
              <Link key={item.href} href={item.href} className="group rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_6px_24px_rgba(15,23,42,0.035)] transition duration-200 hover:-translate-y-1 hover:border-[#D4AF37]/50 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0C1A3D] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{item.eyebrow}</span>
                  <span className="text-xs font-semibold tabular-nums text-[#B08B36]">{item.number}</span>
                </div>
                <h3 className="mt-5 text-xl font-semibold tracking-tight text-[#0C1A3D]">{item.title}</h3>
                <p className="mt-2 min-h-[3rem] text-sm leading-6 text-slate-500">{item.description}</p>
                <p className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-sm font-semibold text-[#0C1A3D]">
                  {item.action}<span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                </p>
              </Link>
            ))}
          </div>
        </section>

        <p className="px-1 text-center text-xs leading-5 text-slate-400">
          A tua jornada não é uma corrida. Avança ao teu ritmo e leva contigo aquilo que faz sentido.
        </p>
      </div>
    </DashboardExperience>
  );
}
