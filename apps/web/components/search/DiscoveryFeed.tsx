"use client";


import DiscoveryCard from "./DiscoveryCard";



const discoveries=[

{

id:"1",

name:"Comunidade Jovem ZION",

type:"Comunidade",

description:"Uma comunidade para jovens crescerem espiritualmente."

},

{

id:"2",

name:"Igreja Adventista Central",

type:"Organização",

description:"Acompanhe actividades e eventos da igreja."

},

{

id:"3",

name:"Estudo Bíblico ZION",

type:"Conteúdo",

description:"Aprenda e partilhe conhecimento bíblico."

}

];



export default function DiscoveryFeed(){


return (

<div

className="
space-y-5
"

>


{discoveries.map((item)=>(


<DiscoveryCard

key={item.id}

name={item.name}

type={item.type}

description={item.description}

/>


))}


</div>

);

}
