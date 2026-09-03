"use client";


import Card from "../ui/Card";

import Badge from "../ui/Badge";



interface ActivityCardProps {


title:string;

type:string;

date:string;

location:string;

participants:number;

status?:string;

}



export default function ActivityCard({

title,

type,

date,

location,

participants,

status="ACTIVE"

}:ActivityCardProps){



return (

<Card>


<div className="
flex
justify-between
items-start
">


<div>


<h3 className="
text-2xl
font-bold
text-[#0C1A3D]
">

{title}

</h3>



<p className="mt-2 text-slate-500">

{type}

</p>


</div>



<Badge

label={status}

type="success"

/>


</div>



<div className="
mt-6
space-y-2
text-slate-600
">


<p>

📅 {date}

</p>


<p>

📍 {location}

</p>


<p>

👥 {participants} participantes

</p>


</div>


</Card>

);

}
