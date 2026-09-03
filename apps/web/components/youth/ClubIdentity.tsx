"use client";


import Card from "../ui/Card";

import Badge from "../ui/Badge";



interface ClubIdentityProps {


name:string;

program:string;

motto:string;

foundationYear:string;

history:string;

logo?:string;

}



export default function ClubIdentity({

name,

program,

motto,

foundationYear,

history,

logo

}:ClubIdentityProps){



return (

<Card>


<div className="
flex
items-center
gap-6
">


<div className="
w-28
h-28
rounded-3xl
bg-white/20
border
border-white/30
flex
items-center
justify-center
overflow-hidden
">


{logo ?


<img

src={logo}

alt={name}

className="
w-full
h-full
object-contain
"

/>


:

<span className="
text-4xl
font-bold
text-[#0C1A3D]
">

{name.charAt(0)}

</span>


}


</div>



<div>


<Badge

label={program}

type="gold"

/>



<h1 className="
mt-3
text-3xl
font-bold
text-[#0C1A3D]
">

{name}

</h1>


<p className="
mt-2
italic
text-slate-500
">

"{motto}"

</p>


</div>


</div>



<div className="mt-8 space-y-4">


<div>


<h3 className="font-bold">

Fundação

</h3>


<p className="text-slate-600">

{foundationYear}

</p>


</div>



<div>


<h3 className="font-bold">

História

</h3>


<p className="text-slate-600">

{history}

</p>


</div>


</div>


</Card>

);

}
