"use client";

import Card from "../ui/Card";
import StatCard from "../ui/StatCard";

interface MinistryDashboardProps {
name: string;
department?: string;
description?: string;

members: number;
leaders: number;
activities: number;

organization?: {
church?: string;
district?: string;
conference?: string;
union?: string;
division?: string;
};

leadership?: {
name: string;
role: string;
}[];

programs?: {
name: string;
status: string;
}[];

reports?: {
title: string;
status: string;
}[];
}

export default function MinistryDashboard({
name,
department = "Ministry",
description = "Gestão estratégica do ministério.",
members,
leaders,
activities,
organization,
leadership = [],
programs = [],
reports = [],
}: MinistryDashboardProps) {
return (
<div className="space-y-8">

  <Card>
    <div className="space-y-4">

      <div>
        <p className="text-sm uppercase tracking-wide text-[#D4AF37] font-semibold">
          {department}
        </p>

        <h1 className="mt-2 text-4xl font-bold text-[#0C1A3D]">
          {name}
        </h1>

        <p className="mt-3 text-slate-500 max-w-3xl">
          {description}
        </p>
      </div>


      {organization && (
        <div className="grid md:grid-cols-3 gap-4 pt-4">

          {organization.church && (
            <div>
              <p className="text-sm text-slate-400">
                Igreja Local
              </p>
              <p className="font-semibold text-[#0C1A3D]">
                {organization.church}
              </p>
            </div>
          )}


          {organization.conference && (
            <div>
              <p className="text-sm text-slate-400">
                Conferência
              </p>
              <p className="font-semibold text-[#0C1A3D]">
                {organization.conference}
              </p>
            </div>
          )}


          {organization.union && (
            <div>
              <p className="text-sm text-slate-400">
                União
              </p>
              <p className="font-semibold text-[#0C1A3D]">
                {organization.union}
              </p>
            </div>
          )}

        </div>
      )}

    </div>
  </Card>



  <div className="grid md:grid-cols-5 gap-6">

    <StatCard
      label="Membros"
      value={members.toString()}
      description="Comunidade activa"
    />

    <StatCard
      label="Líderes"
      value={leaders.toString()}
      description="Equipa ministerial"
    />

    <StatCard
      label="Programas"
      value={activities.toString()}
      description="Iniciativas activas"
    />

    <StatCard
      label="Participação"
      value="--"
      description="Engagement"
    />

    <StatCard
      label="Impacto"
      value="--"
      description="Crescimento"
    />

  </div>



  <div className="grid lg:grid-cols-2 gap-6">


    <Card>

      <h2 className="text-xl font-bold text-[#0C1A3D]">
        Leadership Command
      </h2>

      <div className="mt-5 space-y-4">

        {leadership.length > 0 ? (

          leadership.map((leader, index) => (

            <div
              key={`${leader.name}-${index}`}
              className="flex justify-between items-center border-b pb-3"
            >

              <div>
                <p className="font-semibold text-[#0C1A3D]">
                  {leader.name}
                </p>

                <p className="text-sm text-slate-500">
                  {leader.role}
                </p>
              </div>

            </div>

          ))

        ) : (

          <p className="text-slate-500">
            Nenhuma liderança registada.
          </p>

        )}

      </div>

    </Card>



    <Card>

      <h2 className="text-xl font-bold text-[#0C1A3D]">
        Programs Center
      </h2>


      <div className="mt-5 space-y-4">

        {programs.length > 0 ? (

          programs.map((program, index) => (

            <div
              key={`${program.name}-${index}`}
              className="flex justify-between"
            >

              <span className="text-[#0C1A3D] font-medium">
                {program.name}
              </span>

              <span className="text-sm text-slate-500">
                {program.status}
              </span>

            </div>

          ))

        ) : (

          <p className="text-slate-500">
            Nenhum programa activo.
          </p>

        )}

      </div>

    </Card>


  </div>



  <Card>

    <h2 className="text-xl font-bold text-[#0C1A3D]">
      Reporting Center
    </h2>


    <div className="mt-5 space-y-3">

      {reports.length > 0 ? (

        reports.map((report, index) => (

          <div
            key={`${report.title}-${index}`}
            className="flex justify-between"
          >

            <span>
              {report.title}
            </span>

            <span className="text-slate-500">
              {report.status}
            </span>

          </div>

        ))

      ) : (

        <p className="text-slate-500">
          Nenhum relatório disponível.
        </p>

      )}

    </div>

  </Card>



  <Card>

    <h2 className="text-xl font-bold text-[#0C1A3D]">
      ZION Insights
    </h2>


    <p className="mt-3 text-slate-500">
      Métricas estratégicas, crescimento e recomendações serão
      disponibilizadas através do Analytics Engine.
    </p>

  </Card>


</div>

);
}
