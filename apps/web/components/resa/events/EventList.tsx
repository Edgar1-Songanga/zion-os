"use client";


import EventCard from "./EventCard";


const events = [

{
title:"Culto de Oração",

description:
"Momento especial de oração e comunhão espiritual.",

date:
"Domingo - 09:00",

location:
"Igreja Central",

online:false

},


{
title:"Estudo Bíblico Online",

description:
"Estudo da Palavra com participação da comunidade ZION.",

date:
"Quarta-feira - 20:00",

online:true

}

];



export default function EventList(){


return (

<div

className="
grid
gap-6
"

>


{events.map((event,index)=>(


<EventCard

key={index}

title={event.title}

description={event.description}

date={event.date}

location={event.location}

online={event.online}

/>


))}


</div>

);


}
