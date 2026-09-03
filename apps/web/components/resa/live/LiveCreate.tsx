"use client";

import { useState } from "react";


export default function LiveCreate(){


const [title,setTitle]=useState("");

const [description,setDescription]=useState("");

const [privacy,setPrivacy]=useState("public");



function createLive(){


console.log({

title,

description,

privacy,

type:"live"

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

Criar Live

</h2>


<input

className="
w-full
mt-4
border
rounded-xl
p-3
"

placeholder="Título da transmissão"

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

placeholder="Descrição da live"

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

value={privacy}

onChange={(e)=>setPrivacy(e.target.value)}

>

<option value="public">

Pública

</option>


<option value="private">

Privada

</option>


</select>



<button

onClick={createLive}

className="
mt-4
px-6
py-3
rounded-full
bg-[#0C1A3D]
text-white
"

>

Iniciar Live

</button>


</div>

);

}
