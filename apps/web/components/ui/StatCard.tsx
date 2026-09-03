"use client";


interface StatCardProps {


title?:string;


label?:string;


value:string;


description?:string;


icon?:React.ReactNode;


className?:string;


}



export default function StatCard({


title,


label,


value,


description,


icon,


className=""


}:StatCardProps){


const heading = title || label || "";



return (


<div

className={`

relative

overflow-hidden

rounded-[28px]

p-6

backdrop-blur-xl

bg-white/10

border

border-white/20

shadow-xl

transition-all

duration-500

hover:scale-[1.02]

${className}

`}

>


<div

className="

absolute

inset-0

bg-gradient-to-br

from-white/20

to-transparent

pointer-events-none

"

/>



<div

className="

relative

z-10

"

>


{icon && (

<div

className="mb-4 text-2xl"

>

{icon}

</div>

)}



<h3 className="text-sm text-slate-500">

{heading}

</h3>



<p className="text-3xl font-bold text-[#0C1A3D]">

{value}

</p>



{description && (

<p className="mt-2 text-sm text-slate-500">

{description}

</p>

)}


</div>


</div>


);


}
