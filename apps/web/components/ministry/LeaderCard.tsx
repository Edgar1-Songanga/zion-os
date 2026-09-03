"use client";


import Card from "../ui/Card";

import Avatar from "../ui/Avatar";

import Badge from "../ui/Badge";



interface LeaderCardProps {


name:string;

role:string;

ministry:string;

photo?:string;

verified?:boolean;

}



export default function LeaderCard({

name,

role,

ministry,

photo,

verified=true

}:LeaderCardProps){



return (

<Card>


<div className="
flex
items-center
gap-5
">


<Avatar

src={photo}

name={name}

size="lg"

verified={verified}

/>



<div>


<h3 className="
text-xl
font-bold
text-[#0C1A3D]
">

{name}

</h3>



<p className="text-slate-500">

{role}

</p>



<p className="text-sm text-slate-400">

{ministry}

</p>



<div className="mt-3">

<Badge

label="VERIFIED LEADER"

type="gold"

/>

</div>


</div>


</div>


</Card>

);

}
