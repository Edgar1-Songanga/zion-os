"use client";

import MuralPost from "./MuralPost";


const posts = [

{
id:"1",
author:"Edgar Songanga",
location:"Angola",
content:
"Hoje partilho uma mensagem de esperança e fé para todos os irmãos."
},


{
id:"2",
author:"Comunidade ZION",
location:"Luanda",
content:
"Momento de oração pela nossa comunidade e pelas famílias."
},


{
id:"3",
author:"Ministério Jovem",
location:"Angola",
content:
"Novo programa espiritual disponível para todos os jovens."
}

];


export default function MuralFeed(){


return (

<div

className="
space-y-6
"

>

{posts.map((post)=>(

<MuralPost

key={post.id}

author={post.author}

location={post.location}

content={post.content}

/>

))}


</div>

);

}
