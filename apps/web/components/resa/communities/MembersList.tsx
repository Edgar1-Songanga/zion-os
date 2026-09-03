"use client";


interface Member {

id:string;

name:string;

role:string;

}



const members:Member[]=[

{

id:"1",

name:"Edgar Songanga",

role:"Administrador"

},

{

id:"2",

name:"Maria Silva",

role:"Membro"

},

{

id:"3",

name:"João Manuel",

role:"Membro"

}

];



export default function MembersList(){


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


<h3 className="text-lg font-bold">

Membros

</h3>



<div className="mt-4 space-y-3">


{members.map((member)=>(


<div

key={member.id}

className="
flex
justify-between
items-center
bg-slate-50
rounded-xl
p-3
"

>


<span className="font-medium">

{member.name}

</span>


<span className="text-sm text-slate-500">

{member.role}

</span>


</div>


))}


</div>


</div>

);

}
