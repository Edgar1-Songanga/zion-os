"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { resaRequest } from "@/lib/resa/api";

type PublicClass = {
  id: string;
  name: string;
  meeting_day: number | null;
  meeting_time: string | null;
  room_label: string | null;
};
type PublicActivity = {
  id: string;
  title: string;
  description: string;
  activity_type: string;
  starts_at: string;
  ends_at?: string | null;
  location: string;
  status: string;
};

const destinations = [
  {
    eyebrow: "ESTUDO BÍBLICO",
    title: "Escola Sabatina",
    description: "Acompanha a lição semanal, consulta referências bíblicas e segue o plano de estudo diário.",
    href: "/sabbath-school",
    action: "Abrir estudo",
    mark: "01",
  },
  {
    eyebrow: "JUVENTUDE E MISSÃO",
    title: "Ministério Jovem",
    description: "Conhece os programas jovens, clubes, formação, serviço comunitário e atividades da igreja.",
    href: "/youth",
    action: "Explorar ministério",
    mark: "02",
  },
];

const weekdays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const activityLabels: Record<string, string> = {
  meeting: "Reunião",
  camp: "Acampamento",
  congress: "Congresso",
  investiture: "Investidura",
  training: "Formação",
  mission: "Missão",
  community_service: "Serviço comunitário",
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function ResaMinistryHub() {
  const [classes, setClasses] = useState<PublicClass[]>([]);
  const [activities, setActivities] = useState<PublicActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      resaRequest<PublicClass[]>("/v1/department-operations/sabbath/classes/community"),
      resaRequest<PublicActivity[]>("/v1/youth/activities/community"),
    ]).then(([classResult, activityResult]) => {
      if (!active) return;
      const failed = classResult.status === "rejected" && activityResult.status === "rejected";
      setLoadError(failed);
      setClasses(classResult.status === "fulfilled" ? classResult.value ?? [] : []);
      setActivities(activityResult.status === "fulfilled" ? activityResult.value ?? [] : []);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <section aria-labelledby="resa-ministry-heading" className="mt-7">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9B7A34]">Vida da igreja</p>
          <h2 id="resa-ministry-heading" className="mt-1 text-xl font-semibold tracking-tight text-[#0C1A3D]">Estudos e ministérios</h2>
          <p className="mt-1 text-sm text-slate-500">Conteúdos, classes e iniciativas que a comunidade pode acompanhar no RESA.</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Acesso comunitário</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {destinations.map((item) => (
          <article key={item.href} className="group relative overflow-hidden rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[#C8A24A]/60 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-6">
            <span aria-hidden="true" className="absolute right-5 top-3 text-5xl font-semibold tracking-tighter text-slate-100 transition group-hover:text-[#C8A24A]/15">{item.mark}</span>
            <p className="relative text-[10px] font-bold uppercase tracking-[0.18em] text-[#9B7A34]">{item.eyebrow}</p>
            <h3 className="relative mt-3 text-xl font-semibold tracking-tight text-[#0C1A3D]">{item.title}</h3>
            <p className="relative mt-2 max-w-xl text-sm leading-6 text-slate-600">{item.description}</p>
            <Link href={item.href} className="relative mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0C1A3D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#172D59]">
              {item.action}<span aria-hidden="true">→</span>
            </Link>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="resa-classes-heading" className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9B7A34]">Comunhão e estudo</p>
              <h3 id="resa-classes-heading" className="mt-1 text-lg font-semibold text-[#0C1A3D]">Classes da Escola Sabatina</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{classes.length}</span>
          </div>
          {loading ? <p className="mt-4 text-sm text-slate-400">A carregar classes publicadas…</p> : classes.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">Ainda não há classes publicadas pela igreja. Quando os responsáveis as publicarem, o nome e o horário aparecerão aqui. Os nomes dos membros e os registos de presença nunca são expostos.</p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {classes.map((item) => (
                <article key={item.id} className="py-3 first:pt-0 last:pb-0">
                  <h4 className="text-sm font-semibold text-[#0C1A3D]">{item.name}</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.meeting_day == null ? "Dia por anunciar" : weekdays[item.meeting_day]}
                    {item.meeting_time ? ` · ${item.meeting_time.slice(0, 5)}` : ""}
                    {item.room_label ? ` · ${item.room_label}` : ""}
                  </p>
                </article>
              ))}
            </div>
          )}
          <Link href="/sabbath-school" className="mt-4 inline-flex text-sm font-semibold text-[#8A6B2B] hover:underline">Abrir Escola Sabatina →</Link>
        </section>

        <section aria-labelledby="resa-youth-activities-heading" className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9B7A34]">Agenda comunitária</p>
              <h3 id="resa-youth-activities-heading" className="mt-1 text-lg font-semibold text-[#0C1A3D]">Atividades do Ministério Jovem</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{activities.length}</span>
          </div>
          {loading ? <p className="mt-4 text-sm text-slate-400">A carregar atividades publicadas…</p> : activities.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">Ainda não há atividades publicadas para a comunidade. Os responsáveis podem publicar reuniões, acampamentos, congressos, formação, missão e serviço comunitário.</p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {activities.map((item) => (
                <article key={item.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold text-[#0C1A3D]">{item.title}</h4>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">{item.status === "ONGOING" ? "Em curso" : item.status === "COMPLETED" ? "Concluída" : "Planeada"}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{activityLabels[item.activity_type] ?? item.activity_type} · {formatDate(item.starts_at)}{item.location ? ` · ${item.location}` : ""}</p>
                  {item.description && <p className="mt-2 line-clamp-3 text-sm leading-5 text-slate-600">{item.description}</p>}
                </article>
              ))}
            </div>
          )}
          <Link href="/youth#youth-activities" className="mt-4 inline-flex text-sm font-semibold text-[#8A6B2B] hover:underline">Ver Ministério Jovem →</Link>
        </section>
      </div>

      {loadError && <p role="status" className="mt-3 px-1 text-xs text-amber-700">Não foi possível carregar a agenda comunitária. Tenta atualizar o RESA mais tarde.</p>}
      <p className="mt-3 px-1 text-xs leading-5 text-slate-500">
        Apenas classes e atividades explicitamente publicadas ficam visíveis. Listas de membros, professores, presenças e dados internos permanecem protegidos.
      </p>
    </section>
  );
}
