"use client";


import Card from "../ui/Card";

import Badge from "../ui/Badge";



interface ClassLevelProps {


name:string;

description:string;

progress:number;

requirements:string[];

}



export default function ClassLevel({

name,

description,

progress,

requirements

}:ClassLevelProps){



return (

<Card>


<Badge

label="CLASS PROGRESS"

type="gold"

/>



<h2 className="
mt-4
text-2xl
font-bold
text-[#0C1A3D]
">

{name}

</h2>



<p className="
mt-3
text-slate-600
">

{description}

</p>



<div className="mt-6">


<div className="
flex
justify-between
text-sm
mb-2
">

<span>

Progresso

</span>


<span>

{progress}%

</span>


</div>



<div className="
h-3
rounded-full
bg-slate-200
overflow-hidden
">


<div

className="
h-full
bg-[#0C1A3D]
"

style={{

width:`${progress}%`

}}

/>


</div>


</div>



<div className="mt-6">


<h3 className="font-bold">

Requisitos

</h3>



<ul className="
mt-3
space-y-2
">


{requirements.map((item,index)=>(


<li

key={index}

className="
text-slate-600
"

>

✓ {item}

</li>


))}


</ul>


</div>


</Card>

);

}
