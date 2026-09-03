"use client";


import Card from "../ui/Card";

import Avatar from "../ui/Avatar";

import Badge from "../ui/Badge";



interface ClubMemberProps {


name:string;

photo?:string;

classLevel:string;

specialties:number;

progress:number;

role:string;

}



export default function ClubMembers({

members

}:{

members:ClubMemberProps[]

}){


return (

<div className="
grid
md:grid-cols-2
gap-6
">


{members.map((member,index)=>(


<Card key={index}>


<div className="
flex
items-center
gap-4
">


<Avatar

src={member.photo}

name={member.name}

size="md"

/>



<div>


<h3 className="
font-bold
text-[#0C1A3D]
">

{member.name}

</h3>


<p className="
text-sm
text-slate-500
">

{member.role}

</p>


</div>


</div>



<div className="mt-5 space-y-3">


<Badge

label={member.classLevel}

type="gold"

/>



<p>

Especialidades:
{member.specialties}

</p>



<div>


<p className="text-sm">

Progresso

</p>


<div className="
h-2
rounded-full
bg-slate-200
overflow-hidden
">


<div

className="
h-full
bg-[#0C1A3D]
"

style={{

width:`${member.progress}%`

}}

/>


</div>


</div>


</div>


</Card>


))}


</div>

);

}
