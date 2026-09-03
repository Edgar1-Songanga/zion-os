"use client";

import { useState } from "react";


export default function EventCreate(){


const [title,setTitle]=useState("");

const [description,setDescription]=useState("");

const [date,setDate]=useState("");



function createEvent(){


console.log({

title,

description,

date

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


<h2 className="font-bold text-xl">

Criar Evento

</h2>



<input

className="
w-full
mt-4
border
rounded-xl
p-3
"

placeholder="Título do evento"

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



<input

type="date"

className="
mt-3
border
rounded-xl
p-3
"

value={date}

onChange={(e)=>setDate(e.target.value)}

/>



<button

onClick={createEvent}

className="
mt-4
px-5
py-2
rounded-full
bg-[#0C1A3D]
text-white
"

>

Criar Evento

</button>



</div>

);

}
