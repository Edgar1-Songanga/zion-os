export default function Metrics(){

const metrics=[

{
title:"Members",
value:"12.5M",
icon:"👥"
},

{
title:"Organizations",
value:"180K",
icon:"🏛️"
},

{
title:"RESA Users",
value:"2.4M",
icon:"🌐"
},

{
title:"Bible Studies",
value:"850K",
icon:"📖"
}

];


return (

<div
className="
grid
grid-cols-4
gap-6
mt-8
"
>

{metrics.map(item=>(

<div
key={item.title}
className="
bg-white
rounded-3xl
p-6
shadow-sm
border
border-slate-200
"
>


<div
className="
text-3xl
"
>
{item.icon}
</div>


<p
className="
mt-4
text-slate-500
"
>
{item.title}
</p>


<h2
className="
text-3xl
font-bold
text-[#0C1A3D]
mt-2
"
>
{item.value}
</h2>


</div>


))}


</div>

)

}
