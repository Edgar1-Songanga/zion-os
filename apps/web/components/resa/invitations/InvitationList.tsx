"use client";


import InviteCard from "./InviteCard";


const invitations=[

{

id:"1",

title:"Estudo Bíblico Online",

from:"Edgar Songanga",

type:"Reunião"

},


{

id:"2",

title:"Comunidade Jovem ZION",

from:"Ministério Jovem",

type:"Comunidade"

},


{

id:"3",

title:"Evento Espiritual",

from:"Igreja ZION",

type:"Evento"

}

];



export default function InvitationList(){


return (

<div

className="
space-y-6
"

>


{invitations.map((invite)=>(


<InviteCard

key={invite.id}

title={invite.title}

from={invite.from}

type={invite.type}

/>


))}


</div>

);

}
