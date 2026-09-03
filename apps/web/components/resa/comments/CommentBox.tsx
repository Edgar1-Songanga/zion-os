"use client";

import { useState } from "react";


interface CommentBoxProps {

onComment?: (text:string)=>void;

}


export default function CommentBox({

onComment

}:CommentBoxProps){


const [comment,setComment]=useState("");



function submitComment(){


if(!comment.trim()) return;


onComment?.(comment);

setComment("");


}



return (

<div className="
flex
gap-2
items-center
mt-4
">


<input

value={comment}

onChange={(e)=>setComment(e.target.value)}

placeholder="Escreva um comentário..."

className="
flex-1
rounded-full
border
px-4
py-2
outline-none
"

/>


<button

onClick={submitComment}

className="
px-4
py-2
rounded-full
bg-black
text-white
"

>

Enviar

</button>


</div>

);


}
