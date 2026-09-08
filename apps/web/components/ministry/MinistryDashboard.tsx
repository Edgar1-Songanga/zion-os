"use client";

import Card from "../ui/Card";
import StatCard from "../ui/StatCard";

import { Ministry } from "./types";


interface MinistryDashboardProps {
  ministry: Ministry;
}


export default function MinistryDashboard({
  ministry,
}: MinistryDashboardProps) {

  return (
    <div className="space-y-8">

      <Card>

        <div className="space-y-4">

          <div>

            <p className="text-sm font-semibold uppercase tracking-wide text-[#D4AF37]">
              {ministry.department}
            </p>


            <h1 className="mt-2 text-4xl font-bold text-[#0C1A3D]">
              {ministry.name}
            </h1>


            <p className="mt-3 text-slate-500 max-w-3xl">
              {ministry.description}
            </p>

          </div>


          <div className="grid md:grid-cols-3 gap-6 pt-4">


            <div>
              <p className="text-sm text-slate-400">
                Igreja Local
              </p>

              <p className="font-semibold text-[#0C1A3D]">
                {ministry.organization.church ?? "-"}
              </p>
            </div>



            <div>
              <p className="text-sm text-slate-400">
                Conferência
              </p>

              <p className="font-semibold text-[#0C1A3D]">
                {ministry.organization.conference ?? "-"}
              </p>
            </div>



            <div>
              <p className="text-sm text-slate-400">
                União
              </p>

              <p className="font-semibold text-[#0C1A3D]">
                {ministry.organization.union ?? "-"}
              </p>
            </div>


          </div>


        </div>

      </Card>



      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">


        <StatCard
          label="Membros"
          value={ministry.metrics.members.toString()}
          description="Comunidade"
        />


        <StatCard
          label="Líderes"
          value={ministry.metrics.leaders.toString()}
          description="Equipa"
        />


        <StatCard
          label="Programas"
          value={ministry.metrics.programs.toString()}
          description="Activos"
        />


        <StatCard
          label="Participação"
          value={`${ministry.metrics.participation}%`}
          description="Envolvimento"
        />


        <StatCard
          label="Crescimento"
          value={`${ministry.metrics.growth}%`}
          description="Evolução"
        />


        <StatCard
          label="Impacto"
          value={`${ministry.metrics.impact}%`}
          description="Resultado"
        />


      </div>



      <div className="grid lg:grid-cols-2 gap-6">


        <Card>

          <h2 className="text-xl font-bold text-[#0C1A3D]">
            Leadership
          </h2>


          <div className="mt-5 space-y-4">


            {ministry.leadership.length === 0 ? (

              <p className="text-slate-500">
                Nenhuma liderança registada.
              </p>

            ) : (

              ministry.leadership.map((leader) => (

                <div
                  key={leader.id}
                  className="flex justify-between border-b pb-3"
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

            )}


          </div>

        </Card>




        <Card>

          <h2 className="text-xl font-bold text-[#0C1A3D]">
            Programs
          </h2>


          <div className="mt-5 space-y-4">


            {ministry.programs.length === 0 ? (

              <p className="text-slate-500">
                Nenhum programa registado.
              </p>

            ) : (

              ministry.programs.map((program) => (

                <div
                  key={program.id}
                  className="flex justify-between"
                >

                  <p className="font-medium text-[#0C1A3D]">
                    {program.name}
                  </p>


                  <span className="text-sm text-slate-500">
                    {program.status}
                  </span>

                </div>

              ))

            )}


          </div>

        </Card>


      </div>



      <Card>

        <h2 className="text-xl font-bold text-[#0C1A3D]">
          Reporting Center
        </h2>


        <div className="mt-5 space-y-3">


          {ministry.reports.length === 0 ? (

            <p className="text-slate-500">
              Nenhum relatório disponível.
            </p>

          ) : (

            ministry.reports.map((report) => (

              <div
                key={report.id}
                className="flex justify-between"
              >

                <span>
                  {report.title}
                </span>


                <span className="text-sm text-slate-500">
                  {report.status}
                </span>


              </div>

            ))

          )}


        </div>

      </Card>


      <Card>

        <h2 className="text-xl font-bold text-[#0C1A3D]">
          ZION Insights
        </h2>


        <p className="mt-3 text-slate-500">
          Análise estratégica do ministério baseada em crescimento,
          participação e impacto.
        </p>

      </Card>


    </div>
  );
              }
