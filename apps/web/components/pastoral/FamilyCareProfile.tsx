"use client";


interface FamilyCareProfileProps {

familyName:string;

church:string;

condition:string;

nextAction:string;

}



export default function FamilyCareProfile({

familyName,

church,

condition,

nextAction

}:FamilyCareProfileProps){


return (

<div

className="
bg-white
rounded-3xl
p-8
border
border-slate-200
shadow-sm
"

>


<h1 className="text-3xl font-bold">

{familyName}

</h1>



<div className="mt-6 space-y-4">


<div>

<p className="text-sm text-slate-500">

Igreja

</p>

<p className="font-bold">

{church}

</p>

</div>



<div>

<p className="text-sm text-slate-500">

Situação actual

</p>

<p className="font-bold">

{condition}

</p>

</div>



<div>

<p className="text-sm text-slate-500">

Próxima acção

</p>

<p className="font-bold">

{nextAction}

</p>

</div>


</div>



<button

className="
mt-8
px-6
py-3
rounded-full
bg-[#0C1A3D]
text-white
"

>

Adicionar Nota Pastoral

</button>


</div>

);

}
