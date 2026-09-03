"use client";


import NotificationList from "./NotificationList";


export default function NotificationCenter(){


return (

<div

className="
bg-slate-50
min-h-screen
p-6
"

>


<div className="max-w-3xl mx-auto">


<h1 className="text-2xl font-bold">

Centro de Notificações

</h1>



<p className="mt-2 text-slate-500">

Todas as actividades importantes do ZION.

</p>



<div className="mt-6">


<NotificationList />


</div>


</div>


</div>

);

}
