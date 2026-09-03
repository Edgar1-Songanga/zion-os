import YouthImpactPanel from "./YouthImpactPanel";
"use client";


import Card from "../../ui/Card";

import StatCard from "../../ui/StatCard";

import {

YOUTH_MINISTRY_CONFIG

} from "../core/YouthMinistryConfig";

import YouthClubService from "../core/YouthClubService";



export default function YouthMinistryDashboard(){



const clubs =

YouthClubService.getAll();



return (

<div className="
space-y-8
">
<YouthImpactPanel

participation={120}

serviceHours={85}

skillsCompleted={32}

spiritualActions={18}

recommendations={[

{

message:
"Aumentar acompanhamento dos membros com menor participação.",

priority:
"high"

},

{

message:
"Continuar projectos de serviço comunitário.",

priority:
"medium"

}

]}

/>

<Card>


<h1 className="
text-3xl
font-bold
text-[#0C1A3D]
">

Ministério Jovem

</h1>


<p className="
mt-2
text-slate-500
">

Gestão institucional dos programas,
clubes e jovens.

</p>


</Card>



<div className="
grid
md:grid-cols-3
gap-6
">


<StatCard

label="Programas"

value={

YOUTH_MINISTRY_CONFIG.programs.length.toString()

}

description="Programas oficiais"

/>



<StatCard

label="Clubes"

value={

clubs.length.toString()

}

description="Clubes registados"

/>



<StatCard

label="Membros"

value={

clubs.reduce(

(total,club)=>

total + club.members.length,

0

).toString()

}

description="Jovens"

/>


</div>



<Card>


<h2 className="
text-xl
font-bold
text-[#0C1A3D]
">

Programas

</h2>



<div className="
mt-4
space-y-3
">


{

YOUTH_MINISTRY_CONFIG.programs.map(

(program)=>(


<div

key={program.id}

className="
p-4
rounded-xl
bg-slate-50
"

>


<h3 className="
font-bold
">

{program.name}

</h3>


<p className="
text-sm
text-slate-600
">

{program.purpose}

</p>


</div>


)

)

}


</div>


</Card>


</div>

);

}
