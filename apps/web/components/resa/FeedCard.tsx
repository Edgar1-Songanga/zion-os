"use client";

import { useState } from "react";

import SpiritualActions from "./SpiritualActions";

import ReactionBar from "./reactions/ReactionBar";

import CommentBox from "./comments/CommentBox";

import CommentList from "./comments/CommentList";


export default function FeedCard(){


const [comments,setComments]=useState<any[]>([

{
id:"1",
author:{
name:"Maria"
},
content:"Que mensagem maravilhosa. Deus abençoe.",
createdAt:new Date()
}

]);



function addComment(text:string){


setComments([

...comments,

{

id:Date.now().toString(),

author:{
name:"Edgar Songanga"
},

content:text,

createdAt:new Date()

}

]);


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


{/* Autor */}

<div className="flex items-center gap-4">


<div

className="
h-12
w-12
rounded-full
bg-[#0C1A3D]
text-white
flex
items-center
justify-center
font-bold
"

>

E

</div>


<div>

<h3 className="font-bold">

Edgar Songanga

</h3>


<p className="text-sm text-slate-500">

Angola

</p>


</div>


</div>



{/* Conteúdo */}

<p

className="
mt-6
text-slate-700
"

>

Hoje partilho uma mensagem de esperança
e fé para todos os irmãos.

</p>



{/* Acções espirituais */}

<SpiritualActions />



{/* Reacções */}

<div className="mt-5">

<ReactionBar />

</div>



{/* Estatísticas */}

<div

className="
mt-6
flex
gap-6
text-sm
text-slate-500
"

>

<span>
🙏 245
</span>


<span>
💬 {comments.length}
</span>


<span>
↗ Partilhar
</span>


</div>



{/* Comentários */}

<div className="mt-6">


<CommentBox

onComment={addComment}

/>


</div>



<div className="mt-4">


<CommentList

comments={comments}

/>


</div>



</div>

)

}
