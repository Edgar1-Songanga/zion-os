"use client";

import { useState } from "react";


export default function ProfileSettings(){


const [publicProfile,setPublicProfile]=useState(true);

const [showBadges,setShowBadges]=useState(true);



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


<h2 className="text-xl font-bold">

Configurações do Perfil

</h2>



<div className="mt-5 space-y-4">



<div

className="
flex
justify-between
items-center
"

>

<span>

Perfil Público

</span>


<button

onClick={()=>setPublicProfile(!publicProfile)}

className="
px-4
py-2
rounded-full
bg-slate-100
"

>

{

publicProfile

?

"Activo"

:

"Privado"

}

</button>


</div>




<div

className="
flex
justify-between
items-center
"

>

<span>

Mostrar Badges

</span>


<button

onClick={()=>setShowBadges(!showBadges)}

className="
px-4
py-2
rounded-full
bg-slate-100
"

>

{

showBadges

?

"Visível"

:

"Oculto"

}

</button>


</div>



</div>


</div>

);

}
