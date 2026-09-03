export default function ProfileStats(){

const stats=[

{
title:"ZION Score",
value:"12,850"
},

{
title:"Followers",
value:"4,250"
},

{
title:"Communities",
value:"18"
},

{
title:"Badges",
value:"12"
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

{stats.map(stat=>(

<div
key={stat.title}
className="
bg-white
rounded-2xl
p-6
shadow-sm
border
border-slate-200
"
>

<p className="text-slate-500">
{stat.title}
</p>


<h2
className="
text-3xl
font-bold
mt-3
text-[#0C1A3D]
"
>
{stat.value}
</h2>


</div>

))}


</div>

)

}
