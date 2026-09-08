"use client";

import Card from "../ui/Card";
import Badge from "../ui/Badge";

import { Ministry } from "./types";


interface MinistryCardProps {
  ministry: Ministry;
  onOpen?: (ministry: Ministry) => void;
}


export default function MinistryCard({
  ministry,
  onOpen,
}: MinistryCardProps) {

  return (
    <Card>

      <div className="space-y-6">


        <div className="flex justify-between items-start gap-4">


          <div>

            <p className="
              text-sm
              uppercase
              tracking-wide
              text-[#D4AF37]
              font-semibold
            ">
              {ministry.department}
            </p>


            <h2 className="
              mt-2
              text-2xl
              font-bold
              text-[#0C1A3D]
            ">
              {ministry.name}
            </h2>


            <p className="
              mt-2
              text-slate-500
              line-clamp-2
            ">
              {ministry.description}
            </p>


          </div>



          <Badge
            label={ministry.status}
            type="gold"
          />


        </div>



        <div className="
          grid
          grid-cols-3
          gap-4
        ">


          <div>

            <p className="
              text-xs
              text-slate-400
            ">
              Membros
            </p>


            <p className="
              mt-1
              text-xl
              font-bold
              text-[#0C1A3D]
            ">
              {ministry.metrics.members}
            </p>

          </div>



          <div>

            <p className="
              text-xs
              text-slate-400
            ">
              Líderes
            </p>


            <p className="
              mt-1
              text-xl
              font-bold
              text-[#0C1A3D]
            ">
              {ministry.metrics.leaders}
            </p>

          </div>



          <div>

            <p className="
              text-xs
              text-slate-400
            ">
              Programas
            </p>


            <p className="
              mt-1
              text-xl
              font-bold
              text-[#0C1A3D]
            ">
              {ministry.metrics.programs}
            </p>

          </div>


        </div>



        <div className="
          border-t
          pt-4
        ">


          <p className="
            text-sm
            text-slate-400
          ">
            Organização
          </p>


          <p className="
            mt-1
            font-medium
            text-[#0C1A3D]
          ">

            {ministry.organization.church ?? "Organização não definida"}

          </p>


        </div>



        <button
          type="button"
          onClick={() => onOpen?.(ministry)}
          className="
            w-full
            rounded-xl
            bg-[#0C1A3D]
            px-6
            py-3
            text-white
            font-semibold
            transition
            hover:opacity-90
          "
        >
          Abrir Ministério
        </button>


      </div>


    </Card>
  );
}
