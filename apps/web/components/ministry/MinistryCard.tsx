"use client";


import Card from "../ui/Card";

import Badge from "../ui/Badge";



interface MinistryCardProps {


name:string;

description:string;

leader:string;

members:number;

status?:string;

}



export default function MinistryCard({

name,

description,

leader,

members,

status="ACTIVE"

}:MinistryCardProps){


return (

<Card>


<div className="flex justify-between items-start">


<div>


<h2 className="text-2xl font-bold text-[#0C1A3D]">

{name}

</h2>


<p className="mt-2 text-slate-500">

{description}

</p>


</div>


<Badge

label={status}

type="gold"

/>


</div>



<div className="mt-6 space-y-3">


<p>

<strong>Líder:</strong> {leader}

</p>


<p>

<strong>Membros:</strong> {members}

</p>


</div>



<button

className="
mt-6
px-6
py-3
rounded-full
bg-[#0C1A3D]
text-white
transition
hover:scale-105
"

>

Abrir Ministério

</button>


</Card>

);

}
