"use client";

import { useState } from "react";


export default function CreateCommunity(){


const [name,setName]=useState("");

const [type,setType]=useState("church");

const [description,setDescription]=useState("");



function createCommunity(){


console.log({

name,

type,

description,

community:"created"

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

Criar Comunidade

</h2>



<input

className="
w-full
mt-4
border
rounded-xl
p-3
"

placeholder="Nome da comunidade"

value={name}

onChange={(e)=>setName(e.target.value)}

/>



<textarea

className="
w-full
mt-3
border
rounded-xl
p-3
"

placeholder="Descrição da comunidade"

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

<option value="church">

Igreja Local

</option>


<option value="department">

Departamento

</option>


<option value="ministry">

Ministério

</option>


<option value="small-group">

Pequeno Grupo

</option>


<option value="interest">

Comunidade de Interesse

</option>


</select>



<button

onClick={createCommunity}

className="
mt-4
px-6
py-3
rounded-full
bg-[#0C1A3D]
text-white
"

>

Criar Comunidade

</button>


</div>

);

}
