"use client";


import Card from "../ui/Card";

import StatCard from "../ui/StatCard";



interface ClubDashboardProps {


clubName:string;

members:number;

leaders:number;

classes:number;

activities:number;

}



export default function ClubDashboard({

clubName,

members,

leaders,

classes,

activities

}:ClubDashboardProps){



return (

<div className="
space-y-8
">


<Card>


<h1 className="
text-3xl
font-bold
text-[#0C1A3D]
">

{clubName}

</h1>



<p className="
mt-2
text-slate-500
">

Centro de gestão e missão do clube.

</p>


</Card>



<div className="
grid
md:grid-cols-4
gap-6
">


<StatCard

label="Membros"

value={members.toString()}

description="Jovens activos"

/>



<StatCard

label="Líderes"

value={leaders.toString()}

description="Equipa"

/>



<StatCard

label="Classes"

value={classes.toString()}

description="Formação"

/>



<StatCard

label="Actividades"

value={activities.toString()}

description="Missão"

/>



</div>



<Card>


<h2 className="
text-xl
font-bold
text-[#0C1A3D]
">

Jornada do Clube

</h2>


<p className="
mt-3
text-slate-600
">

Acompanhamento espiritual, formação e serviço.

</p>


</Card>


</div>

);

}
