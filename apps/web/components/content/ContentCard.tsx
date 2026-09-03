"use client";


interface ContentCardProps {

title:string;

type:string;

description:string;

}



export default function ContentCard({

title,

type,

description

}:ContentCardProps){


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


<h3 className="text-lg font-bold">

{title}

</h3>


<span

className="
text-sm
text-slate-500
"

>

{type}

</span>


</div>



<p className="mt-4 text-slate-600">

{description}

</p>



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

Abrir

</button>


</div>

);

}
