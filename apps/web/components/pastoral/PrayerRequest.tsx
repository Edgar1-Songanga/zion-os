"use client";


interface PrayerRequestProps {

person:string;

request:string;

status:string;

date:string;

}



export default function PrayerRequest({

person,

request,

status,

date

}:PrayerRequestProps){


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


<div className="flex justify-between items-start">


<h3 className="text-xl font-bold">

Pedido de Oração

</h3>


<span

className="
px-3
py-1
rounded-full
bg-blue-50
text-blue-700
text-sm
"

>

{status}

</span>


</div>



<div className="mt-5 space-y-3">


<p>

👤 {person}

</p>


<p>

🙏 {request}

</p>


<p>

📅 {date}

</p>


</div>



<button

className="
mt-5
px-5
py-2
rounded-full
bg-[#0C1A3D]
text-white
"

>

Acompanhar

</button>


</div>

);

}
