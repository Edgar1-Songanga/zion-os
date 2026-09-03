"use client";


const metrics = [

{
title:"Members",
value:"12.5M",
description:"Registered community members"
},

{
title:"Organizations",
value:"180K",
description:"Churches and institutions"
},

{
title:"RESA Users",
value:"2.4M",
description:"Connected communities"
},

{
title:"Bible Studies",
value:"850K",
description:"Active spiritual journeys"
}

];


export default function Metrics(){


return (

<div
className="
grid
grid-cols-1
md:grid-cols-2
xl:grid-cols-4
gap-6
mt-8
"
>

{metrics.map((item)=>(

<div
key={item.title}
className="
relative
overflow-hidden
rounded-[32px]
p-6
bg-white/10
backdrop-blur-2xl
border
border-white/20
shadow-xl
transition-all
duration-500
hover:scale-[1.02]
"
>


<div
className="
absolute
inset-0
bg-gradient-to-br
from-[#D4AF37]/20
via-transparent
to-transparent
"
/>


<div
className="
relative
z-10
"
>


<p
className="
text-sm
uppercase
tracking-[0.25em]
text-white/50
"
>
{item.title}
</p>


<h2
className="
mt-4
text-4xl
font-bold
text-white
"
>
{item.value}
</h2>


<p
className="
mt-3
text-sm
text-white/60
"
>
{item.description}
</p>


</div>


</div>


))}


</div>

)

}
