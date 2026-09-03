"use client";


interface MemberProfileProps {

name:string;

email:string;

church:string;

role:string;

baptismDate:string;

}



export default function MemberProfile({

name,

email,

church,

role,

baptismDate

}:MemberProfileProps){


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


<div>


<h1 className="text-3xl font-bold">

{name}

</h1>


<p className="mt-2 text-slate-500">

{email}

</p>


</div>



<div className="mt-8 grid gap-5 md:grid-cols-3">



<div className="bg-slate-50 rounded-2xl p-5">

<p className="text-sm text-slate-500">

Igreja

</p>


<p className="font-bold">

{church}

</p>

</div>



<div className="bg-slate-50 rounded-2xl p-5">

<p className="text-sm text-slate-500">

Ministério

</p>


<p className="font-bold">

{role}

</p>

</div>



<div className="bg-slate-50 rounded-2xl p-5">

<p className="text-sm text-slate-500">

Baptismo

</p>


<p className="font-bold">

{baptismDate}

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

Editar Perfil

</button>


</div>

);

}
