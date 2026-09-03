"use client";


interface OrganizationCardProps {

name:string;

type:string;

location:string;

members:number;

}



export default function OrganizationCard({

name,

type,

location,

members

}:OrganizationCardProps){


return (

<div

className="
bg-white
rounded-3xl
p-6
border
border-slate-200
shadow-sm
"

>


<div className="flex justify-between items-start">


<div>


<h3 className="text-xl font-bold">

{name}

</h3>


<p className="text-sm text-slate-500">

{type}

</p>


</div>


<span

className="
px-3
py-1
rounded-full
bg-blue-50
text-blue-700
text-sm
"

>

Activo

</span>


</div>



<div className="mt-5 space-y-2">


<p>

📍 {location}

</p>


<p>

👥 {members} membros

</p>


</div>



<button

className="
mt-5
px-5
py-2
rounded-full
bg-[#0C1A3D]
text-white
"

>

Ver Organização

</button>


</div>

);

}
