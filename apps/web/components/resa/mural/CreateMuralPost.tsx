"use client";

import { useState } from "react";


export default function CreateMuralPost(){


const [content,setContent]=useState("");



function publishPost(){


if(!content.trim()) return;


console.log({

content,

type:"spiritual_post"

});


setContent("");



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


<h2 className="font-bold text-xl">

Criar publicação

</h2>



<textarea

className="
w-full
mt-4
border
rounded-2xl
p-4
min-h-[120px]
"

placeholder="
Partilhe uma mensagem, testemunho ou reflexão...
"

value={content}

onChange={(e)=>setContent(e.target.value)}

/>



<button

onClick={publishPost}

className="
mt-4
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
