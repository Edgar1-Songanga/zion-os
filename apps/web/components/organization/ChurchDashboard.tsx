"use client";


const modules=[

{

name:"Membros",

value:"450"

},

{

name:"Departamentos",

value:"8"

},

{

name:"Eventos",

value:"12"

},

{

name:"Relatórios",

value:"24"

},

{

name:"Ofertas",

value:"Actualizado"

}

];



export default function ChurchDashboard(){


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

Painel da Igreja

</h1>



<p className="mt-2 text-slate-500">

Gestão completa da igreja local.

</p>



<div

className="
mt-8
grid
gap-5
md:grid-cols-3
"

>


{modules.map((item)=>(


<div

key={item.name}

className="
bg-white
rounded-3xl
p-6
border
border-slate-200
shadow-sm
"

>


<h3 className="font-bold">

{item.name}

</h3>


<p className="mt-3 text-2xl font-bold text-[#0C1A3D]">

{item.value}

</p>


</div>


))}


</div>


</div>


</div>

);

}
