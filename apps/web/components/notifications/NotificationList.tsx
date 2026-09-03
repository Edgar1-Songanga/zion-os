"use client";


import NotificationCard from "./NotificationCard";



const notifications=[

{

id:"1",

title:"Novo comentário",

message:"Maria comentou a sua publicação.",

type:"Comentário"

},


{

id:"2",

title:"Pedido de oração",

message:"João apoiou o seu pedido de oração.",

type:"Oração"

},


{

id:"3",

title:"Nova conquista",

message:"Recebeu o badge Construtor de Comunidade.",

type:"Badge"

}

];



export default function NotificationList(){


return (

<div className="space-y-4">


{notifications.map((notification)=>(


<NotificationCard

key={notification.id}

title={notification.title}

message={notification.message}

type={notification.type}

/>


))}


</div>

);

}
