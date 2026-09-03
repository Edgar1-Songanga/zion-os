"use client";


import Card from "../ui/Card";

import Badge from "../ui/Badge";



interface SpecialtyCardProps {


name:string;

category:string;

description:string;

level?:string;

completed?:boolean;

}



export default function SpecialtyCard({

name,

category,

description,

level="Básico",

completed=false

}:SpecialtyCardProps){



return (

<Card>


<div className="
flex
justify-between
items-start
">


<div>


<h2 className="
text-xl
font-bold
text-[#0C1A3D]
">

{name}

</h2>



<p className="
mt-2
text-slate-500
">

{category}

</p>


</div>



<Badge

label={completed ? "CONCLUÍDA":"EM CURSO"}

type={completed ? "success":"gold"}

/>


</div>



<p className="
mt-5
text-slate-600
">

{description}

</p>



<div className="
mt-5
text-sm
text-slate-500
">

Nível: {level}

</div>


</Card>

);

}
