"use client";

import { useState } from "react";


export default function VerificationCenter(){


const [status,setStatus]=useState("Not Verified");


function requestVerification(){


setStatus("Pending Review");


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

Centro de Verificação

</h2>



<div className="mt-4">


<p className="text-sm text-slate-500">

Estado da conta

</p>


<p className="font-semibold">

{status}

</p>


</div>



<div className="mt-5 space-y-3">


<div

className="
p-4
rounded-xl
bg-slate-50
"

>

✓ Identidade pessoal

</div>



<div

className="
p-4
rounded-xl
bg-slate-50
"

>

✓ Tipo de perfil

</div>



<div

className="
p-4
rounded-xl
bg-slate-50
"

>

✓ Organização / Ministério

</div>


</div>



<button

onClick={requestVerification}

className="
mt-5
px-6
py-3
rounded-full
bg-[#0C1A3D]
text-white
"

>

Solicitar Verificação

</button>


</div>

);

}
