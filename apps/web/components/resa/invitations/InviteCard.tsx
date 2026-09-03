"use client";


interface InviteCardProps {

title:string;

from:string;

type:string;

}



export default function InviteCard({

title,

from,

type

}:InviteCardProps){


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

<h3 className="font-bold text-lg">

{title}

</h3>


<p className="text-sm text-slate-500">

Convite enviado por {from}

</p>


</div>



<span className="text-sm text-slate-500">

{type}

</span>


</div>



<button

className="
mt-5
px-6
py-3
rounded-full
bg-[#0C1A3D]
text-white
"

>

Aceitar convite

</button>


</div>

);

}
