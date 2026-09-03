"use client";


import Card from "../ui/Card";

import Badge from "../ui/Badge";



interface ClubCardProps {


name:string;

program:string;

motto:string;

director:string;

members:number;

classLevel:string;

logo?:string;

status?:string;

}



export default function ClubCard({

name,

program,

motto,

director,

members,

classLevel,

logo,

status="ACTIVE"

}:ClubCardProps){



return (

<Card>


<div className="
flex
gap-5
items-start
">


<div className="
w-20
h-20
rounded-2xl
bg-white/20
border
border-white/30
flex
items-center
justify-center
overflow-hidden
">


{logo ?

<img

src={logo}

alt={name}

className="
w-full
h-full
object-contain
"

/>

:

<span className="
text-2xl
font-bold
text-[#0C1A3D]
">

{name.charAt(0)}

</span>

}


</div>



<div>


<h2 className="
text-2xl
font-bold
text-[#0C1A3D]
">

{name}

</h2>


<p className="
text-slate-500
">

{program}

</p>


</div>


</div>



<div className="mt-5">


<Badge

label={status}

type="success"

/>


</div>



<div className="
mt-6
space-y-3
">


<p>

<strong>Lema:</strong> {motto}

</p>


<p>

<strong>Director:</strong> {director}

</p>


<p>

<strong>Membros:</strong> {members}

</p>


<p>

<strong>Classe:</strong> {classLevel}

</p>


</div>



</Card>

);

}
