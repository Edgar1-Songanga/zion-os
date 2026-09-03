"use client";


interface Participant {

id:string;

name:string;

role:string;

}



const participants:Participant[]=[

{

id:"1",

name:"Edgar Songanga",

role:"Anfitrião"

},

{

id:"2",

name:"Maria Silva",

role:"Participante"

},

{

id:"3",

name:"João Manuel",

role:"Participante"

}

];



export default function ParticipantsList(){


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


<h3 className="font-bold text-lg">

Participantes

</h3>



<div className="mt-4 space-y-3">


{participants.map((person)=>(


<div

key={person.id}

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

{person.name}

</span>


<span className="text-sm text-slate-500">

{person.role}

</span>


</div>


))}


</div>


</div>

);

}
