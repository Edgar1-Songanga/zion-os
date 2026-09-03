"use client";


const activities = [

{
title:"New organization registered",
time:"2 minutes ago"
},

{
title:"New RESA community created",
time:"15 minutes ago"
},

{
title:"Monthly institutional report submitted",
time:"1 hour ago"
},

{
title:"New spiritual testimony published",
time:"3 hours ago"
},

{
title:"New member connected",
time:"Today"
}

];


export default function ActivityPanel(){


return (

<div
className="
rounded-[32px]
p-8
bg-white/10
backdrop-blur-2xl
border
border-white/20
shadow-xl
"
>


<h2
className="
text-2xl
font-semibold
text-white
"
>
Ecosystem Activity
</h2>


<p
className="
mt-2
text-white/60
"
>
Real-time movement across the ZION global network.
</p>



<div
className="
mt-8
space-y-4
"
>

{activities.map((activity)=>(

<div
key={activity.title}
className="
flex
items-center
justify-between
rounded-2xl
p-4
bg-white/5
border
border-white/10
"
>


<div>

<p
className="
text-white
font-medium
"
>
{activity.title}
</p>


<p
className="
text-sm
text-white/50
mt-1
"
>
{activity.time}
</p>

</div>


<div
className="
h-3
w-3
rounded-full
bg-[#D4AF37]
"
/>


</div>

))}


</div>


</div>

)

}
