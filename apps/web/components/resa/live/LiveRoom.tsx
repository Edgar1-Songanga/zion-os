"use client";


interface LiveRoomProps {

title:string;

host:string;

participants:number;

}



export default function LiveRoom({

title,

host,

participants

}:LiveRoomProps){


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

🔴

</div>


<h2 className="text-xl font-bold mt-3">

{title}

</h2>


<p className="text-sm mt-2">

Transmitido por {host}

</p>


</div>

</div>



<div className="mt-5 flex justify-between items-center">


<div className="text-sm text-slate-500">

👥 {participants} participantes

</div>



<button

className="
px-5
py-2
rounded-full
bg-red-600
text-white
"

>

Sair da Live

</button>


</div>


</div>

);

}
