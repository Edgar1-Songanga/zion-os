"use client";


const stats=[

{

title:"Membros",

value:"1,250"

},

{

title:"Famílias",

value:"380"

},

{

title:"Departamentos",

value:"12"

},

{

title:"Novos membros",

value:"45"

}

];



export default function MemberDashboard(){


return (

<div

className="
bg-slate-50
min-h-screen
p-6
"

>


<div className="max-w-5xl mx-auto">


<h1 className="text-3xl font-bold">

Gestão de Membros

</h1>



<p className="mt-2 text-slate-500">

Visão geral dos membros da organização.

</p>



<div

className="
mt-8
grid
gap-5
md:grid-cols-4
"

>


{stats.map((stat)=>(


<div

key={stat.title}

className="
bg-white
rounded-3xl
p-6
border
border-slate-200
shadow-sm
"

>


<p className="text-sm text-slate-500">

{stat.title}

</p>


<h2 className="mt-3 text-3xl font-bold text-[#0C1A3D]">

{stat.value}

</h2>


</div>


))}


</div>


</div>


</div>

);

}
