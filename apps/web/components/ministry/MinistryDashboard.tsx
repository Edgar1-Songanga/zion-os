"use client";


import Card from "../ui/Card";

import StatCard from "../ui/StatCard";



interface MinistryDashboardProps {


name:string;

members:number;

leaders:number;

activities:number;

}



export default function MinistryDashboard({

name,

members,

leaders,

activities

}:MinistryDashboardProps){



return (

<div className="space-y-8">


<Card>


<h1 className="
text-3xl
font-bold
text-[#0C1A3D]
">

{name}

Dashboard

</h1>


<p className="
mt-2
text-slate-500
">

Gestão estratégica do ministério.

</p>


</Card>



<div className="
grid
md:grid-cols-3
gap-6
">


<StatCard

label="Membros"

value={members.toString()}

description="Participantes activos"

/>



<StatCard

label="Líderes"

value={leaders.toString()}

description="Equipa ministerial"

/>



<StatCard

label="Actividades"

value={activities.toString()}

description="Projectos realizados"

/>



</div>



<Card>


<h2 className="
text-xl
font-bold
text-[#0C1A3D]
">

Próximas Acções

</h2>


<p className="mt-3 text-slate-500">

Planeamento, eventos e acompanhamento.

</p>


</Card>


</div>

);

}
