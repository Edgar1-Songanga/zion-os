"use client";


import Card from "../ui/Card";

import Badge from "../ui/Badge";

import {CLUB_TYPES} from "./ClubTypeConfig";



interface ClubTypeSelectorProps {


onSelect?:(type:string)=>void;

}



export default function ClubTypeSelector({

onSelect

}:ClubTypeSelectorProps){



return (

<div className="
grid
md:grid-cols-2
gap-6
">


{CLUB_TYPES.map((club)=>(


<Card

key={club.name}

className="
cursor-pointer
"

onClick={()=>onSelect?.(club.name)}

>


<Badge

label={club.name}

type="gold"

/>



<h2 className="
mt-4
text-2xl
font-bold
text-[#0C1A3D]
">

{club.name}

</h2>



<p className="
mt-3
text-slate-600
">

{club.description}

</p>



<div className="
mt-4
text-sm
text-slate-500
">


<p>

Idade:

{club.ageRange}

</p>



<p className="mt-2">

Filosofia:

{club.philosophy}

</p>


</div>


</Card>


))}


</div>

);

}
