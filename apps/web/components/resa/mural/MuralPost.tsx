"use client";


import ReactionBar from "../reactions/ReactionBar";

import CommentBox from "../comments/CommentBox";

import CommentList from "../comments/CommentList";


interface MuralPostProps {

author:string;

location?:string;

content:string;

}



export default function MuralPost({

author,

location,

content

}:MuralPostProps){


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

{

author.charAt(0)

}

</div>


<div>

<h3 className="font-bold">

{author}

</h3>


{location && (

<p className="text-sm text-slate-500">

{location}

</p>

)}

</div>


</div>



{/* Conteúdo */}

<p className="mt-6 text-slate-700">

{content}

</p>



{/* Acções espirituais */}

<div className="mt-5">

<ReactionBar />

</div>



{/* Comentários */}

<div className="mt-5">

<CommentBox />

</div>



<div className="mt-4">

<CommentList comments={[]} />

</div>



</div>

);

}
