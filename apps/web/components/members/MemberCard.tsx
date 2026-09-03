"use client";


interface MemberCardProps {

name:string;

church:string;

department:string;

status:string;

}



export default function MemberCard({

name,

church,

department,

status

}:MemberCardProps){


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
h-14
w-14
rounded-full
bg-[#0C1A3D]
text-white
flex
items-center
justify-center
font-bold
text-xl
"

>

M

</div>



<div>


<h3 className="text-lg font-bold">

{name}

</h3>


<p className="text-sm text-slate-500">

{church}

</p>


</div>


</div>



<div className="mt-5 space-y-2">


<p>

⛪ {department}

</p>


<p>

Status: {status}

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

Ver Perfil

</button>


</div>

);

}
