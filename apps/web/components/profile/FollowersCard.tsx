"use client";

import { useState } from "react";


export default function FollowersCard(){


const [following,setFollowing]=useState(false);



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

Seguidores

</h2>



<div className="mt-5 flex gap-8">


<div>

<p className="text-sm text-slate-500">

Seguidores

</p>


<p className="text-2xl font-bold">

1250

</p>


</div>



<div>

<p className="text-sm text-slate-500">

A seguir

</p>


<p className="text-2xl font-bold">

340

</p>


</div>


</div>



<button

onClick={()=>setFollowing(!following)}

className="
mt-5
px-6
py-3
rounded-full
bg-[#0C1A3D]
text-white
"

>

{

following

?

"Seguindo"

:

"Seguir"

}

</button>


</div>

);

}
