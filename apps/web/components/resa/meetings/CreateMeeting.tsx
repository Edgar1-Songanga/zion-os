"use client";

import { useState } from "react";


export default function CreateMeeting(){


const [title,setTitle]=useState("");

const [description,setDescription]=useState("");

const [type,setType]=useState("public");



function createMeeting(){


console.log({

title,

description,

type,

meeting:"created"

});


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

Criar Reunião

</h2>



<input

className="
w-full
mt-4
border
rounded-xl
p-3
"

placeholder="Nome da reunião"

value={title}

onChange={(e)=>setTitle(e.target.value)}

/>



<textarea

className="
w-full
mt-3
border
rounded-xl
p-3
"

placeholder="Descrição"

value={description}

onChange={(e)=>setDescription(e.target.value)}

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

<option value="public">

Reunião aberta

</option>


<option value="private">

Reunião privada

</option>


</select>



<button

onClick={createMeeting}

className="
mt-4
px-6
py-3
rounded-full
bg-[#0C1A3D]
text-white
"

>

Criar Sala

</button>


</div>

);

}
