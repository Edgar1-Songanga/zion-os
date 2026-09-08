"use client";

import Card from "../ui/Card";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";

import { MinistryLeader } from "./types";


interface LeaderCardProps {
  leader: MinistryLeader;
  ministryName?: string;
}


export default function LeaderCard({
  leader,
  ministryName,
}: LeaderCardProps) {

  return (
    <Card>

      <div className="
        flex
        items-center
        gap-5
      ">

        <Avatar
          src={leader.photo}
          name={leader.name}
          size="lg"
          verified={leader.verified}
        />


        <div className="flex-1">

          <div className="
            flex
            items-center
            justify-between
            gap-4
          ">

            <h3 className="
              text-xl
              font-bold
              text-[#0C1A3D]
            ">
              {leader.name}
            </h3>


            {leader.verified && (
              <Badge
                label="VERIFIED"
                type="gold"
              />
            )}

          </div>



          <p className="
            mt-1
            text-slate-500
          ">
            {leader.role}
          </p>



          {ministryName && (

            <p className="
              mt-2
              text-sm
              text-slate-400
            ">
              {ministryName}
            </p>

          )}


        </div>


      </div>


    </Card>
  );
}
