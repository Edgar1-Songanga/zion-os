"use client";


interface MeetingCardProps {

title:string;

host:string;

participants:number;

type:string;

}



export default function MeetingCard({

title,

host,

participants,

type

}:MeetingCardProps){


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


<div className="flex justify-between">


<div>

<h3 className="text-lg font-bold">

{title}

</h3>


<p className="text-sm text-slate-500">

Organizado por {host}

</p>


</div>



<div className="text-sm text-slate-500">

{type}

</div>


</div>



<div className="mt-5 flex justify-between items-center">


<span className="text-sm text-slate-500">

👥 {participants} participantes

</span>



<button

className="
px-6
py-3
rounded-full
bg-[#0C1A3D]
text-white
"

>

Entrar

</button>


</div>


</div>

);

}
