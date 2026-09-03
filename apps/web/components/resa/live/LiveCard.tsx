"use client";


interface LiveCardProps {

title:string;

host:string;

viewers:number;

}



export default function LiveCard({

title,

host,

viewers

}:LiveCardProps){


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


<div className="flex justify-between items-center">


<div>

<h3 className="font-bold text-lg">

🔴 {title}

</h3>


<p className="text-sm text-slate-500">

Por {host}

</p>

</div>


<div className="text-sm text-slate-500">

{viewers} pessoas

</div>


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

Entrar na Live

</button>


</div>

);

}
