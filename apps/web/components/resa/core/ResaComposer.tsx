"use client";

import { useState } from "react";


export default function ResaComposer(){


const [type,setType]=useState("post");

const [content,setContent]=useState("");



function publish(){


console.log({

type,

content,

created:true

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

Criar no RESA

</h2>



<select

className="
mt-4
border
rounded-xl
p-3
"

value={type}

onChange={(e)=>setType(e.target.value)}

>


<option value="post">

Publicação

</option>


<option value="prayer">

Pedido de oração

</option>


<option value="event">

Evento

</option>


<option value="live">

Live

</option>


<option value="meeting">

Reunião

</option>


</select>



<textarea

className="
w-full
mt-4
border
rounded-xl
p-3
"

placeholder="Partilhe algo com a comunidade..."

value={content}

onChange={(e)=>setContent(e.target.value)}

 />



<button

onClick={publish}

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
