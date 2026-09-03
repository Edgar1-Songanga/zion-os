"use client";


import Card from "../ui/Card";

import StatCard from "../ui/StatCard";



interface YouthDashboardProps {


youngPeople:number;

clubs:number;

leaders:number;

investitures:number;

}



export default function YouthDashboard({

youngPeople,

clubs,

leaders,

investitures

}:YouthDashboardProps){



return (

<div className="space-y-8">


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

Discipulado, liderança e serviço.

</p>


</Card>



<div className="
grid
md:grid-cols-4
gap-6
">


<StatCard

label="Jovens activos"

value={youngPeople.toString()}

description="Membros envolvidos"

/>



<StatCard

label="Clubes"

value={clubs.toString()}

description="Clubes registados"

/>



<StatCard

label="Líderes"

value={leaders.toString()}

description="Equipa formada"

/>



<StatCard

label="Investiduras"

value={investitures.toString()}

description="Conquistas registadas"

/>


</div>



<Card>


<h2 className="
text-xl
font-bold
text-[#0C1A3D]
">

Impacto Missionário

</h2>


<p className="
mt-3
text-slate-600
">

Acompanhamento de serviço, evangelismo e crescimento espiritual.

</p>


</Card>


</div>

);

}
