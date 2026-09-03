"use client";


import Card from "../ui/Card";

import Badge from "../ui/Badge";



interface YouthProgramProfileProps {


name:string;

description:string;

philosophy:string;

leader:string;

members:number;

clubs:number;

}



export default function YouthProgramProfile({

name,

description,

philosophy,

leader,

members,

clubs

}:YouthProgramProfileProps){



return (

<div className="space-y-6">


<Card>


<Badge

label="YOUTH MINISTRY"

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
text-lg
text-slate-600
">

{description}

</p>


</Card>



<Card>


<h2 className="
text-xl
font-bold
text-[#0C1A3D]
">

Filosofia

</h2>


<p className="
mt-3
text-slate-600
">

{philosophy}

</p>


</Card>



<div className="
grid
md:grid-cols-3
gap-6
">


<Card>

<h3 className="font-bold">

Líder

</h3>

<p className="mt-3">

{leader}

</p>

</Card>



<Card>

<h3 className="font-bold">

Clubes

</h3>

<p className="
mt-3
text-3xl
font-bold
">

{clubs}

</p>

</Card>



<Card>

<h3 className="font-bold">

Membros

</h3>

<p className="
mt-3
text-3xl
font-bold
">

{members}

</p>

</Card>


</div>


</div>

);

}
