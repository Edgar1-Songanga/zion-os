"use client";


import StatCard from "@/components/ui/StatCard";


interface DashboardMetric {

label:string;

value:string;

description:string;

trend?:string;

}


const metrics:DashboardMetric[] = [

{
label:"People Connected",
value:"12.5M",
description:"Members across the global ZION ecosystem",
trend:"+8.4%"
},

{
label:"Organizations",
value:"245K",
description:"Churches, missions and institutions connected",
trend:"+5.2%"
},

{
label:"Countries",
value:"180",
description:"Countries reached by the digital platform",
trend:"+12"
},

{
label:"RESA Communities",
value:"98K",
description:"Active spiritual communities",
trend:"+6.7%"
}

];



export default function StatsGrid(){


return (

<section

className="
mt-10
"

>


<div

className="
mb-6
"

>

<h2

className="
text-2xl
font-semibold
text-white
"

>

Global Impact

</h2>


<p

className="
text-white/70
mt-2
"

>

Real-time vision of the ZION global ecosystem

</p>


</div>



<div

className="
grid
grid-cols-1
md:grid-cols-2
xl:grid-cols-4
gap-6
"

>


{metrics.map((metric)=>(


<StatCard

key={metric.label}

label={metric.label}

value={metric.value}

description={

`${metric.description} ${metric.trend ?? ""}`

}

/>


))}


</div>


</section>

);

}
