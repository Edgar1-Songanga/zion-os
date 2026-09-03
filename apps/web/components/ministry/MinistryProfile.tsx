"use client";


import Card from "../ui/Card";

import Badge from "../ui/Badge";



interface MinistryProfileProps {


name:string;

mission:string;

leader:string;

department:string;

members:number;

}



export default function MinistryProfile({

name,

mission,

leader,

department,

members

}:MinistryProfileProps){



return (

<div className="space-y-6">


<Card>


<div>


<Badge

label={department}

type="gold"

/>



<h1 className="
mt-4
text-4xl
font-bold
text-[#0C1A3D]
">

{name}

</h1>



<p className="
mt-4
text-slate-600
text-lg
">

{mission}

</p>


</div>


</Card>



<div className="
grid
md:grid-cols-3
gap-6
">


<Card>


<h3 className="font-bold">

Liderança

</h3>


<p className="mt-3">

{leader}

</p>


</Card>



<Card>


<h3 className="font-bold">

Membros

</h3>


<p className="mt-3 text-3xl font-bold">

{members}

</p>


</Card>



<Card>


<h3 className="font-bold">

Estado

</h3>


<p className="mt-3">

Activo

</p>


</Card>


</div>


</div>

);

}
