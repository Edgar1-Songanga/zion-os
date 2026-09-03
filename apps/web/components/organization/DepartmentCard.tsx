"use client";


interface DepartmentCardProps {

name:string;

leader:string;

members:number;

}



export default function DepartmentCard({

name,

leader,

members

}:DepartmentCardProps){


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


<p className="mt-2 text-slate-500">

Líder: {leader}

</p>


</div>


<span>

⛪

</span>


</div>



<div className="mt-5">


<p className="text-sm text-slate-500">

Membros

</p>


<p className="text-2xl font-bold">

{members}

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

Ver Departamento

</button>


</div>

);

}
