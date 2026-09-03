"use client";


interface ChatMessage {

id:string;

sender:string;

content:string;

time:string;

}



const messages:ChatMessage[]=[

{

id:"1",

sender:"Maria",

content:"Que Deus continue a abençoar este ministério.",

time:"10:30"

},

{

id:"2",

sender:"Edgar",

content:"Amém. Vamos continuar juntos na missão.",

time:"10:32"

}

];



export default function ChatWindow(){


return (

<div

className="
bg-white
rounded-3xl
border
border-slate-200
p-6
space-y-4
"

>


<h2 className="font-bold text-xl">

Comunidade ZION

</h2>



<div className="space-y-3">


{messages.map((message)=>(


<div

key={message.id}

className="
bg-slate-50
rounded-2xl
p-4
"

>


<div className="font-semibold">

{message.sender}

</div>


<p className="text-slate-700">

{message.content}

</p>


<span className="text-xs text-slate-400">

{message.time}

</span>


</div>


))}


</div>


</div>

);

}
