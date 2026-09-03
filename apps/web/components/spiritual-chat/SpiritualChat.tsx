"use client";

import { useState } from "react";

import {
spiritualSearch
}
from "@/services/spiritual-chat";


export default function SpiritualChat(){


const [message,setMessage]=useState("");

const [response,setResponse]=useState<any>(null);



function send(){


const result =
spiritualSearch(message);


setResponse(result);


}



return (

<div
className="
max-w-3xl
bg-white
rounded-3xl
p-8
shadow
border
"
>


<h2
className="
text-2xl
font-bold
text-[#0C1A3D]
"
>
🙏 ZION Spiritual Assistant
</h2>


<div
className="
flex
gap-3
mt-6
"
>


<input

value={message}

onChange={
e=>setMessage(e.target.value)
}

placeholder="Pergunte sobre a Bíblia..."

className="
flex-1
border
rounded-xl
p-4
"

/>


<button

onClick={send}

className="
bg-[#0C1A3D]
text-white
px-6
rounded-xl
"

>
Enviar
</button>


</div>



{response && (

<div
className="
mt-8
bg-slate-50
rounded-2xl
p-6
"
>


<h3
className="
text-xl
font-bold
"
>
{response.title}
</h3>


<p
className="
mt-3
"
>
{response.answer}
</p>


<div className="mt-4">

{response.references.map(
(ref:string)=>(

<p
key={ref}
>
📖 {ref}
</p>

)

)}

</div>


{
response.belief &&

<p
className="
mt-4
font-semibold
"
>
📜 {response.belief}
</p>

}


</div>

)}



</div>

)

}
