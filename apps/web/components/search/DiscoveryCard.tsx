"use client";


interface DiscoveryCardProps {

name:string;

type:string;

description:string;

}



export default function DiscoveryCard({

name,

type,

description

}:DiscoveryCardProps){


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


<div className="flex justify-between items-start">


<div>


<h3 className="text-lg font-bold">

{name}

</h3>


<p className="text-sm text-slate-500">

{type}

</p>


</div>


<button

className="
px-4
py-2
rounded-full
bg-[#0C1A3D]
text-white
text-sm
"

>

Ver

</button>


</div>



<p className="mt-4 text-slate-600">

{description}

</p>


</div>

);

}
