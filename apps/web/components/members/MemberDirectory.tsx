"use client";


import MemberCard from "./MemberCard";



const members=[

{

id:"1",

name:"João Manuel",

church:"Igreja Viana",

department:"Escola Sabatina",

status:"Activo"

},


{

id:"2",

name:"Maria Silva",

church:"Igreja Central",

department:"Ministério da Mulher",

status:"Activo"

},


{

id:"3",

name:"Pedro José",

church:"Igreja Cazenga",

department:"Ministério Jovem",

status:"Activo"

}

];



export default function MemberDirectory(){


return (

<div

className="
space-y-5
"

>


{members.map((member)=>(


<MemberCard

key={member.id}

name={member.name}

church={member.church}

department={member.department}

status={member.status}

/>


))}


</div>

);

}
