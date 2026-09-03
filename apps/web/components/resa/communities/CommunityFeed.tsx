"use client";


interface Post {

id:string;

author:string;

message:string;

}



const posts:Post[]=[

{

id:"1",

author:"Edgar Songanga",

message:"Bem-vindos à nossa comunidade ZION."

},

{

id:"2",

author:"Maria Silva",

message:"Que Deus abençoe todos os membros."

}

];



export default function CommunityFeed(){


return (

<div

className="
space-y-5
"

>


{posts.map((post)=>(


<div

key={post.id}

className="
bg-white
rounded-3xl
p-6
border
border-slate-200
shadow-sm
"

>


<h4 className="font-bold">

{post.author}

</h4>


<p className="mt-3 text-slate-700">

{post.message}

</p>



<div className="mt-4 flex gap-5 text-sm text-slate-500">

<span>

🙏 Apoiar

</span>


<span>

💬 Comentar

</span>


<span>

↗ Partilhar

</span>


</div>


</div>


))}


</div>

);

}
