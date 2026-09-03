"use client";


interface FamilyProfileProps {

familyName:string;

leader:string;

members:string[];

church:string;

status:string;

}



export default function FamilyProfile({

familyName,

leader,

members,

church,

status

}:FamilyProfileProps){


return (

<div

className="
bg-white
rounded-3xl
p-8
border
border-slate-200
shadow-sm
"

>


<h1 className="text-3xl font-bold">

{familyName}

</h1>



<div className="mt-6 space-y-3">


<p>

👤 Responsável: <strong>{leader}</strong>

</p>


<p>

⛪ Igreja: <strong>{church}</strong>

</p>


<p>

🙏 Estado: <strong>{status}</strong>

</p>


</div>



<div className="mt-8">


<h2 className="text-xl font-bold">

Membros da Família

</h2>


<div className="mt-4 space-y-2">


{members.map((member)=>(


<div

key={member}

className="
bg-slate-50
rounded-xl
p-3
"

>

{member}

</div>


))}


</div>


</div>


</div>

);

}
