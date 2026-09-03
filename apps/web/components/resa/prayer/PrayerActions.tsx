export default function PrayerActions(){

const actions=[

{
title:"🙏 Prayer Warrior",
description:"Ore por membros da comunidade"
},

{
title:"📖 Bible Student",
description:"Complete estudos bíblicos"
},

{
title:"🤝 Community Builder",
description:"Crie grupos e ajude pessoas"
}

];


return (

<div
className="
bg-[#0C1A3D]
rounded-3xl
p-8
text-white
"
>


<h2
className="
text-2xl
font-bold
"
>
Your Spiritual Journey
</h2>


<div
className="
mt-6
space-y-4
"
>


{actions.map(action=>(

<div
key={action.title}
className="
bg-white/10
rounded-xl
p-4
"
>

<h3
className="
font-bold
"
>
{action.title}
</h3>


<p
className="
text-slate-300
mt-2
"
>
{action.description}
</p>


</div>

))}


</div>


</div>

)

}
