"use client";


interface NotificationCardProps {

title:string;

message:string;

type:string;

}



export default function NotificationCard({

title,

message,

type

}:NotificationCardProps){


return (

<div

className="
bg-white
rounded-2xl
p-5
border
border-slate-200
shadow-sm
"

>


<div className="flex justify-between">


<h3 className="font-bold">

{title}

</h3>


<span className="text-sm text-slate-500">

{type}

</span>


</div>



<p className="mt-3 text-slate-600">

{message}

</p>


</div>

);

}
