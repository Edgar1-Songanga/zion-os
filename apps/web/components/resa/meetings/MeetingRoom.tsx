"use client";


interface MeetingRoomProps {

title:string;

host:string;

participants:number;

privateRoom?:boolean;

}



export default function MeetingRoom({

title,

host,

participants,

privateRoom=false

}:MeetingRoomProps){


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


<div

className="
aspect-video
rounded-2xl
bg-[#0C1A3D]
flex
items-center
justify-center
text-white
"

>

<div className="text-center">


<div className="text-4xl">

👥

</div>


<h2 className="text-xl font-bold mt-3">

{title}

</h2>


<p className="text-sm mt-2">

Por {host}

</p>


</div>


</div>



<div className="mt-5 flex justify-between items-center">


<div className="text-sm text-slate-500">

Participantes: {participants}

</div>



<div className="text-sm text-slate-500">

{

privateRoom

?

"🔒 Privada"

:

"🌍 Aberta"

}

</div>


</div>



<div className="mt-5 flex gap-3">


<button

className="
px-5
py-2
rounded-full
bg-[#0C1A3D]
text-white
"

>

Microfone

</button>



<button

className="
px-5
py-2
rounded-full
border
"

>

Câmara

</button>


</div>


</div>

);

}
