"use client";

import { useState } from "react";


interface MessageBoxProps {

onSend?: (message:string)=>void;

}



export default function MessageBox({

onSend

}:MessageBoxProps){


const [message,setMessage]=useState("");



function sendMessage(){


if(!message.trim()) return;


onSend?.(message);

setMessage("");


}



return (

<div

className="
flex
gap-3
items-center
mt-4
"

>


<input

className="
flex-1
border
rounded-full
px-4
py-3
outline-none
"

placeholder="Escreva uma mensagem..."

value={message}

onChange={(e)=>setMessage(e.target.value)}

/>


<button

onClick={sendMessage}

className="
px-5
py-3
rounded-full
bg-[#0C1A3D]
text-white
"

>

Enviar

</button>


</div>

);

}
