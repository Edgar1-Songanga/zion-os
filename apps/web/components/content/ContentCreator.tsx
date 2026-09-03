"use client";

import { useState } from "react";


export default function ContentCreator(){


const [title,setTitle]=useState("");

const [type,setType]=useState("Article");



function publish(){

console.log({

title,

type

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

Criar Conteúdo

</h2>



<input

value={title}

onChange={(e)=>setTitle(e.target.value)}

placeholder="Título do conteúdo"

className="
mt-5
w-full
px-4
py-3
rounded-xl
border
"

/>



<select

value={type}

onChange={(e)=>setType(e.target.value)}

className="
mt-4
w-full
px-4
py-3
rounded-xl
border
"

>

<option>

Article

</option>

<option>

Bible Study

</option>

<option>

Video

</option>

<option>

Sermon

</option>

<option>

Music

</option>


</select>



<button

onClick={publish}

className="
mt-5
px-6
py-3
rounded-full
bg-[#0C1A3D]
text-white
"

>

Publicar

</button>


</div>

);

}
