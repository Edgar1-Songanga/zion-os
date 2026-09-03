"use client";


import ContentCard from "./ContentCard";



const contents=[

{

id:"1",

title:"Estudo Bíblico da Semana",

type:"Bible Study",

description:"Aprenda mais sobre a Palavra de Deus."

},


{

id:"2",

title:"Mensagem de Esperança",

type:"Sermon",

description:"Uma mensagem para fortalecer a fé."

},


{

id:"3",

title:"Louvor ZION",

type:"Music",

description:"Música espiritual para adoração."

}

];



export default function ContentFeed(){


return (

<div

className="
space-y-5
"

>


{contents.map((content)=>(


<ContentCard

key={content.id}

title={content.title}

type={content.type}

description={content.description}

/>


))}


</div>

);

}
