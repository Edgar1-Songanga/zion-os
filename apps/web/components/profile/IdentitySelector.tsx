"use client";

import { useState } from "react";


const identities=[

"Member",

"Pastor",

"Public Figure",

"Singer",

"Leader",

"Teacher",

"Content Creator",

"Organization"

];



export default function IdentitySelector(){


const [selected,setSelected]=useState<string[]>([]);



function toggleIdentity(identity:string){


if(selected.includes(identity)){

setSelected(
selected.filter(item=>item!==identity)
);

}else{

setSelected([
...selected,
identity
]);

}


}



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

Quem é você no ZION?

</h2>



<p className="text-sm text-slate-500 mt-2">

Pode escolher mais de uma identidade.

</p>



<div className="mt-5 flex flex-wrap gap-3">


{identities.map((identity)=>(


<button

key={identity}

onClick={()=>toggleIdentity(identity)}

className={

`
px-4
py-2
rounded-full
border
${selected.includes(identity)
?
"bg-[#0C1A3D] text-white"
:
"bg-white"
}
`

}

>

{identity}

</button>


))}


</div>



<div className="mt-5 text-sm">

Selecionado:

{selected.join(", ")}

</div>


</div>

);

}
