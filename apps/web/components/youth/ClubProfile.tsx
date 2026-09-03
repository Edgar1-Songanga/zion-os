"use client";


import Card from "../ui/Card";

import Badge from "../ui/Badge";



interface ClubProfileProps {


name:string;

program:string;

motto:string;

history:string;

director:string;

members:number;

classes:number;

specialties:number;

}



export default function ClubProfile({

name,

program,

motto,

history,

director,

members,

classes,

specialties

}:ClubProfileProps){



return (

<div className="space-y-6">


<Card>


<Badge

label={program}

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
mt-3
text-lg
text-slate-600
">

{motto}

</p>


</Card>



<Card>


<h2 className="
text-xl
font-bold
text-[#0C1A3D]
">

História do Clube

</h2>


<p className="
mt-3
text-slate-600
">

{history}

</p>


</Card>



<div className="
grid
md:grid-cols-4
gap-6
">


<Card>

<h3 className="font-bold">

Director

</h3>

<p className="mt-3">

{director}

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



<Card>

<h3 className="font-bold">

Classes

</h3>

<p className="
mt-3
text-3xl
font-bold
">

{classes}

</p>

</Card>



<Card>

<h3 className="font-bold">

Especialidades

</h3>

<p className="
mt-3
text-3xl
font-bold
">

{specialties}

</p>

</Card>


</div>


</div>

);

}
