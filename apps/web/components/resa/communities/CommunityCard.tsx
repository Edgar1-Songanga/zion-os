"use client";


interface CommunityCardProps {

name:string;

type:string;

leader:string;

members:number;

}



export default function CommunityCard({

name,

type,

leader,

members

}:CommunityCardProps){


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


<div className="flex justify-between">


<div>

<h3 className="text-lg font-bold">

{name}

</h3>


<p className="text-sm text-slate-500">

{type}

</p>


</div>


<div className="text-sm text-slate-500">

👥 {members}

</div>


</div>



<p className="mt-4 text-sm text-slate-600">

Líder: {leader}

</p>



<button

className="
mt-5
px-6
py-3
rounded-full
bg-[#0C1A3D]
text-white
"

>

Entrar na Comunidade

</button>


</div>

);

}
