"use client";


interface Activity {

title:string;

subtitle:string;

time:string;

}


const activities:Activity[] = [

{
title:"New church connected",
subtitle:"Angola Mission joined the ZION ecosystem",
time:"5 minutes ago"
},

{
title:"RESA community created",
subtitle:"New spiritual community activated",
time:"18 minutes ago"
},

{
title:"Monthly report submitted",
subtitle:"Organization report successfully received",
time:"42 minutes ago"
},

{
title:"New testimony published",
subtitle:"Community shared a spiritual experience",
time:"1 hour ago"
},

{
title:"New member integrated",
subtitle:"A new person joined the platform",
time:"2 hours ago"
}

];



export default function ActivityFeed(){


return (

<section

className="
relative
overflow-hidden
rounded-[32px]
p-8
bg-white/10
backdrop-blur-2xl
border
border-white/20
shadow-2xl
"

>


<div

className="
absolute
inset-0
bg-gradient-to-br
from-white/20
to-transparent
pointer-events-none
"

/>


<div

className="
relative
z-10
"

>


<div className="mb-8">


<h2

className="
text-2xl
font-semibold
text-white
"

>
Live ZION Activity
</h2>


<p

className="
mt-2
text-white/60
"

>
Global ecosystem activity stream
</p>


</div>



<div

className="
space-y-6
"

>


{activities.map((activity,index)=>(


<div

key={index}

className="
flex
gap-5
items-start
"

>


<div

className="
mt-2
h-3
w-3
rounded-full
bg-[#D4AF37]
shadow-lg
"

></div>



<div>


<h3

className="
text-white
font-medium
"

>
{activity.title}
</h3>


<p

className="
text-sm
text-white/60
mt-1
"

>
{activity.subtitle}
</p>


<span

className="
text-xs
text-white/40
mt-2
block
"

>
{activity.time}
</span>


</div>


</div>


))}


</div>


</div>


</section>

);

}
