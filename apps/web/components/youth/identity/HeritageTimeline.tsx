"use client";


import Card from "../../ui/Card";



interface HeritageItem {


year:string;

title:string;

description:string;

}



interface HeritageTimelineProps {


items:HeritageItem[];

}



export default function HeritageTimeline({

items

}:HeritageTimelineProps){



return (

<div className="
space-y-6
">


{items.map((item,index)=>(


<Card

key={index}

>


<div className="
flex
gap-6
">


<div className="
text-3xl
font-bold
text-[#0C1A3D]
">

{item.year}

</div>



<div>


<h3 className="
text-xl
font-bold
text-[#0C1A3D]
">

{item.title}

</h3>



<p className="
mt-2
text-slate-600
">

{item.description}

</p>


</div>


</div>


</Card>


))}


</div>

);

}
