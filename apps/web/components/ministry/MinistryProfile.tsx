"use client";

import Card from "../ui/Card";
import Badge from "../ui/Badge";

import { Ministry } from "./types";


interface MinistryProfileProps {
  ministry: Ministry;
}


export default function MinistryProfile({
  ministry,
}: MinistryProfileProps) {

  return (
    <div className="space-y-6">


      <Card>

        <div>

          <Badge
            label={ministry.department}
            type="gold"
          />


          <h1 className="
            mt-4
            text-4xl
            font-bold
            text-[#0C1A3D]
          ">
            {ministry.name}
          </h1>


          <p className="
            mt-4
            text-lg
            text-slate-600
            max-w-3xl
          ">
            {ministry.description}
          </p>


          <div className="mt-6">

            <Badge
              label={ministry.status}
              type="gold"
            />

          </div>


        </div>

      </Card>



      <div className="
        grid
        md:grid-cols-3
        gap-6
      ">


        <Card>

          <h3 className="font-bold text-[#0C1A3D]">
            Liderança
          </h3>


          <p className="mt-3 text-slate-600">

            {ministry.leadership.length} líderes registados.

          </p>

        </Card>



        <Card>

          <h3 className="font-bold text-[#0C1A3D]">
            Membros
          </h3>


          <p className="
            mt-3
            text-3xl
            font-bold
            text-[#0C1A3D]
          ">

            {ministry.metrics.members}

          </p>

        </Card>



        <Card>

          <h3 className="font-bold text-[#0C1A3D]">
            Estado
          </h3>


          <p className="mt-3 text-slate-600">

            {ministry.status}

          </p>

        </Card>


      </div>



      <Card>

        <h2 className="
          text-xl
          font-bold
          text-[#0C1A3D]
        ">
          Organizational Network
        </h2>


        <div className="
          mt-5
          grid
          md:grid-cols-2
          gap-4
        ">


          <div>

            <p className="text-sm text-slate-400">
              Igreja Local
            </p>

            <p className="font-semibold">
              {ministry.organization.church ?? "-"}
            </p>

          </div>



          <div>

            <p className="text-sm text-slate-400">
              Distrito
            </p>

            <p className="font-semibold">
              {ministry.organization.district ?? "-"}
            </p>

          </div>



          <div>

            <p className="text-sm text-slate-400">
              Conferência
            </p>

            <p className="font-semibold">
              {ministry.organization.conference ?? "-"}
            </p>

          </div>



          <div>

            <p className="text-sm text-slate-400">
              Divisão
            </p>

            <p className="font-semibold">
              {ministry.organization.division ?? "-"}
            </p>

          </div>


        </div>


      </Card>


    </div>
  );
            }
