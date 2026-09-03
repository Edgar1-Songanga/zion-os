"use client";


interface PastoralCardProps {

name:string;

type:string;

status:string;

lastVisit:string;

}



export default function PastoralCard({

name,

type,

status,

lastVisit

}:PastoralCardProps){


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
bg-green-50
text-green-700
text-sm
"

>

{status}

</span>


</div>



<div className="mt-5">


<p>

🙏 Última visita: {lastVisit}

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

Abrir Acompanhamento

</button>


</div>

);

}
