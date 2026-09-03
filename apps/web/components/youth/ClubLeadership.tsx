"use client";


import Card from "../ui/Card";

import Avatar from "../ui/Avatar";

import Badge from "../ui/Badge";



interface Leader {


name:string;

role:string;

photo?:string;

}



interface ClubLeadershipProps {


leaders:Leader[];

}



export default function ClubLeadership({

leaders

}:ClubLeadershipProps){



return (

<Card>


<h2 className="
text-2xl
font-bold
text-[#0C1A3D]
">

Liderança do Clube

</h2>



<div className="
mt-6
space-y-5
">


{leaders.map((leader,index)=>(


<div

key={index}

className="
flex
items-center
gap-4
"

>


<Avatar

src={leader.photo}

name={leader.name}

size="md"

/>



<div>


<h3 className="font-bold">

{leader.name}

</h3>


<p className="text-slate-500">

{leader.role}

</p>


</div>



<Badge

label="LÍDER"

type="gold"

/>


</div>


))}


</div>


</Card>

);

}
