"use client";


interface CreatorProfileProps {

name:string;

followers:number;

}



export default function CreatorProfile({

name,

followers

}:CreatorProfileProps){


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


<div className="flex items-center gap-4">


<div

className="
h-16
w-16
rounded-full
bg-[#0C1A3D]
text-white
flex
items-center
justify-center
font-bold
text-2xl
"

>

E

</div>



<div>


<h2 className="text-xl font-bold">

{name}

</h2>


<div className="flex gap-2 mt-2">


<span

className="
px-3
py-1
rounded-full
bg-blue-50
text-blue-700
text-sm
"

>

✓ Criador Verificado

</span>



<span

className="
px-3
py-1
rounded-full
bg-yellow-50
text-yellow-700
text-sm
"

>

⭐ Fundador

</span>


</div>


</div>


</div>



<div className="mt-6 flex justify-between">


<div>

<p className="text-sm text-slate-500">

Seguidores

</p>


<p className="font-bold">

{followers}

</p>


</div>



<button

className="
px-6
py-3
rounded-full
bg-[#0C1A3D]
text-white
"

>

Seguir

</button>


</div>


</div>

);

}
