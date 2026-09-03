"use client";

import { useState } from "react";


interface Comment {

id:string;

user:string;

message:string;

}



export default function LiveComments(){


const [comment,setComment]=useState("");


const [comments,setComments]=useState<Comment[]>([

{

id:"1",

user:"Maria",

message:"Deus abençoe esta transmissão."

},

{

id:"2",

user:"João",

message:"Estou a acompanhar a mensagem."

}

]);



function sendComment(){


if(!comment.trim()) return;


setComments([

...comments,

{

id:Date.now().toString(),

user:"Edgar",

message:comment

}

]);


setComment("");



}



return (

<div

className="
bg-white
rounded-3xl
p-6
border
border-slate-200
"

>


<h3 className="font-bold text-lg">

Comentários da Live

</h3>



<div className="mt-4 space-y-3">


{comments.map((item)=>(


<div

key={item.id}

className="
bg-slate-50
rounded-xl
p-3
"

>

<p className="font-semibold">

{item.user}

</p>


<p className="text-slate-600">

{item.message}

</p>


</div>


))}


</div>



<div className="flex gap-3 mt-5">


<input

className="
flex-1
border
rounded-full
px-4
py-3
"

placeholder="Escreva um comentário..."

value={comment}

onChange={(e)=>setComment(e.target.value)}

/>



<button

onClick={sendComment}

className="
px-5
rounded-full
bg-[#0C1A3D]
text-white
"

>

Enviar

</button>


</div>


</div>

);

}
