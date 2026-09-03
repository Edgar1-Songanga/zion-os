"use client";


interface EventCardProps {

title:string;

description:string;

date:string;

location?:string;

online?:boolean;

}



export default function EventCard({

title,

description,

date,

location,

online=false

}:EventCardProps){


return (

<div

className="
bg-white
rounded-3xl
p-6
border
border-slate-200
shadow-sm
"

>


<h3 className="font-bold text-lg">

{title}

</h3>


<p className="text-sm text-slate-500 mt-2">

{date}

</p>


<p className="mt-4 text-slate-700">

{description}

</p>



{location && (

<p className="mt-3 text-sm">

📍 {location}

</p>

)}



{online && (

<p className="mt-2 text-sm text-blue-600">

🌐 Evento Online

</p>

)}



<button

className="
mt-5
px-5
py-2
rounded-full
bg-[#0C1A3D]
text-white
"

>

Participar

</button>


</div>

);

}
