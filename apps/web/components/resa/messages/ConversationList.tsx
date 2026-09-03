"use client";


interface Conversation {

id:string;

name:string;

lastMessage:string;

online?:boolean;

}



const conversations:Conversation[]=[

{

id:"1",

name:"Comunidade ZION Angola",

lastMessage:"Vamos orar juntos hoje.",

online:true

},

{

id:"2",

name:"Ministério Jovem",

lastMessage:"Novo estudo bíblico disponível."

},

{

id:"3",

name:"Maria Paulo",

lastMessage:"Deus abençoe a família."

}

];



export default function ConversationList(){


return (

<div

className="
space-y-3
"

>


{conversations.map((conversation)=>(


<div

key={conversation.id}

className="
bg-white
rounded-2xl
border
border-slate-200
p-4
hover:bg-slate-50
cursor-pointer
"

>


<div className="flex justify-between">


<h3 className="font-bold">

{conversation.name}

</h3>


{conversation.online && (

<span className="text-xs text-green-600">

Online

</span>

)}


</div>


<p className="text-sm text-slate-500 mt-2">

{conversation.lastMessage}

</p>


</div>


))}


</div>

);

}
