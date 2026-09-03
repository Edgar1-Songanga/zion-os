"use client";

import { useState } from "react";


export default function InvitationCreate(){


const [title,setTitle]=useState("");

const [type,setType]=useState("meeting");



function createInvitation(){


const invitation={

title,

type,

link:
"zion.app/invite/"+Date.now()

};


console.log(invitation);


}



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


<h2 className="text-xl font-bold">

Criar Convite

</h2>



<input

className="
w-full
mt-4
border
rounded-xl
p-3
"

placeholder="Título do convite"

value={title}

onChange={(e)=>setTitle(e.target.value)}

/>



<select

className="
mt-3
border
rounded-xl
p-3
"

value={type}

onChange={(e)=>setType(e.target.value)}

>


<option value="meeting">

Reunião

</option>


<option value="community">

Comunidade

</option>


<option value="event">

Evento

</option>


<option value="profile">

Perfil

</option>


</select>



<button

onClick={createInvitation}

className="
mt-4
px-6
py-3
rounded-full
bg-[#0C1A3D]
text-white
"

>

Gerar Convite

</button>


</div>

);

}
