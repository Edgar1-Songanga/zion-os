"use client";

import Card from "../ui/Card";
import Badge from "../ui/Badge";


interface MinistryActivity {
  id: string;
  title: string;
  description?: string;
  category: string;
  date: string;
  location?: string;
  participants: number;
  status: "PLANNED" | "ACTIVE" | "COMPLETED";
}


interface ActivityCardProps {
  activity: MinistryActivity;
}


export default function ActivityCard({
  activity,
}: ActivityCardProps) {

  return (
    <Card>

      <div className="space-y-5">


        <div className="
          flex
          justify-between
          items-start
          gap-4
        ">


          <div>

            <p className="
              text-sm
              uppercase
              tracking-wide
              text-[#D4AF37]
              font-semibold
            ">
              {activity.category}
            </p>


            <h3 className="
              mt-2
              text-xl
              font-bold
              text-[#0C1A3D]
            ">
              {activity.title}
            </h3>


          </div>


          <Badge
            label={activity.status}
            type="gold"
          />


        </div>



        {activity.description && (

          <p className="
            text-slate-500
          ">
            {activity.description}
          </p>

        )}



        <div className="
          grid
          md:grid-cols-3
          gap-4
          pt-4
          border-t
        ">


          <div>

            <p className="
              text-xs
              text-slate-400
            ">
              Data
            </p>


            <p className="
              mt-1
              font-semibold
              text-[#0C1A3D]
            ">
              {activity.date}
            </p>


          </div>



          <div>

            <p className="
              text-xs
              text-slate-400
            ">
              Participantes
            </p>


            <p className="
              mt-1
              font-semibold
              text-[#0C1A3D]
            ">
              {activity.participants}
            </p>


          </div>



          <div>

            <p className="
              text-xs
              text-slate-400
            ">
              Local
            </p>


            <p className="
              mt-1
              font-semibold
              text-[#0C1A3D]
            ">
              {activity.location ?? "-"}
            </p>


          </div>


        </div>


      </div>


    </Card>
  );
              }
