"use client";

import { useState } from "react";


export default function PrayerRequestForm(){

const [message,setMessage]=useState("");


return (

<div
className="
bg-white
rounded-3xl
p-8
shadow
border
border-slate-200
"
>


<h2
className="
text-2xl
font-bold
text-[#0C1A3D]
"
>
🙏 Pedido de Oração
</h2>


<p
className="
mt-2
text-slate-500
"
>
Partilhe um pedido e permita que a comunidade ore consigo.
</p>



<textarea

value={message}

onChange={
e=>setMessage(e.target.value)
}

placeholder="Escreva o seu pedido de oração..."

className="
mt-6
w-full
h-32
rounded-xl
border
p-4
outline-none
"

/>



<button

className="
mt-5
bg-[#0C1A3D]
text-white
px-6
py-3
rounded-xl
"

>

Enviar Pedido

</button>



</div>

)

}
