"use client";


const stats=[

{

title:"Famílias acompanhadas",

value:"120"

},

{

title:"Visitas realizadas",

value:"85"

},

{

title:"Pedidos de oração",

value:"34"

},

{

title:"Casos pendentes",

value:"12"

}

];



export default function PastoralDashboard(){


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

Painel Pastoral

</h1>



<p className="mt-2 text-slate-500">

Acompanhamento espiritual da comunidade.

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
