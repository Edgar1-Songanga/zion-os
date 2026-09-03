"use client";


const navigation=[

{

name:"Mural",

icon:"🏠"

},

{

name:"Comunidades",

icon:"👥"

},

{

name:"Lives",

icon:"🔴"

},

{

name:"Reuniões",

icon:"🎥"

},

{

name:"Eventos",

icon:"📅"

},

{

name:"Oração",

icon:"🙏"

},

{

name:"Mensagens",

icon:"💬"

}

];



export default function ResaNavigation(){


return (

<div

className="
bg-white
rounded-3xl
p-4
border
border-slate-200
shadow-sm
"

>


<nav className="flex flex-wrap gap-3">


{navigation.map((item)=>(


<button

key={item.name}

className="
px-5
py-3
rounded-full
bg-slate-50
hover:bg-slate-100
text-sm
font-medium
"

>


<span>

{item.icon}

</span>


{" "}

{item.name}


</button>


))}


</nav>


</div>

);

}
