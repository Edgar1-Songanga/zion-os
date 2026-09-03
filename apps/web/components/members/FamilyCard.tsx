"use client";


interface FamilyCardProps {

familyName:string;

members:number;

church:string;

leader:string;

}



export default function FamilyCard({

familyName,

members,

church,

leader

}:FamilyCardProps){


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


<h3 className="text-xl font-bold">

{familyName}

</h3>


<p className="mt-2 text-slate-500">

Responsável: {leader}

</p>



<div className="mt-5 space-y-2">


<p>

👥 {members} membros

</p>


<p>

⛪ {church}

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

Ver Família

</button>


</div>

);

}
