"use client";


interface OrganizationProfileProps {

name:string;

type:string;

leader:string;

members:number;

location:string;

}



export default function OrganizationProfile({

name,

type,

leader,

members,

location

}:OrganizationProfileProps){


return (

<div

className="
bg-white
rounded-3xl
p-8
border
border-slate-200
shadow-sm
"

>


<h1 className="text-3xl font-bold">

{name}

</h1>



<p className="mt-2 text-slate-500">

{type}

</p>



<div className="mt-8 grid gap-4 md:grid-cols-3">


<div className="p-4 rounded-2xl bg-slate-50">

<p className="text-sm text-slate-500">

Líder

</p>

<p className="font-bold">

{leader}

</p>

</div>



<div className="p-4 rounded-2xl bg-slate-50">

<p className="text-sm text-slate-500">

Membros

</p>

<p className="font-bold">

{members}

</p>

</div>



<div className="p-4 rounded-2xl bg-slate-50">

<p className="text-sm text-slate-500">

Localização

</p>

<p className="font-bold">

{location}

</p>

</div>


</div>


<button

className="
mt-8
px-6
py-3
rounded-full
bg-[#0C1A3D]
text-white
"

>

Entrar na Organização

</button>


</div>

);

}
