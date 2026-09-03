export default function KnowledgeCards(){


const cards=[


{
title:"Bible Library",
description:
"Search Scriptures and biblical themes",
icon:"📖"
},


{
title:"28 Fundamental Beliefs",
description:
"Official Adventist beliefs",
icon:"📜"
},


{
title:"Church Manual",
description:
"Organization and principles",
icon:"⛪"
},


{
title:"Bible Studies",
description:
"Learn step by step",
icon:"📝"
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


{cards.map(card=>(


<div
key={card.title}
className="
bg-white
rounded-3xl
p-6
border
shadow-sm
"
>


<div className="text-4xl">
{card.icon}
</div>


<h3
className="
mt-4
font-bold
text-[#0C1A3D]
"
>
{card.title}
</h3>


<p
className="
mt-2
text-slate-500
"
>
{card.description}
</p>


</div>


))}


</div>

)

}
