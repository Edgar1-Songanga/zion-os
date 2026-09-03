"use client";


interface AchievementCardProps {

title:string;

description:string;

icon:string;

}



export default function AchievementCard({

title,

description,

icon

}:AchievementCardProps){


return (

<div

className="
bg-white
rounded-3xl
p-6
border
border-slate-200
shadow-sm
"

>


<div className="flex items-center gap-4">


<div

className="
h-12
w-12
rounded-full
bg-yellow-50
flex
items-center
justify-center
text-2xl
"

>

{icon}

</div>



<div>


<h3 className="font-bold">

{title}

</h3>


<p className="text-sm text-slate-500">

{description}

</p>


</div>


</div>


</div>

);

}
