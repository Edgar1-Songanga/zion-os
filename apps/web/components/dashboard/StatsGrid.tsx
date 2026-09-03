import StatCard from "@/components/ui/StatCard";


export default function StatsGrid(){

const stats=[

{
title:"Members",
value:"12.5M"
},

{
title:"Organizations",
value:"245K"
},

{
title:"Countries",
value:"180"
},

{
title:"RESA Communities",
value:"98K"
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

<StatCard
key={stat.title}
title={stat.title}
value={stat.value}
/>

))}


</div>

)

}
