"use client";


import Card from "../../ui/Card";

import Badge from "../../ui/Badge";



interface YouthBrandCardProps {


name:string;

program:string;

motto:string;

philosophy:string;

logo?:string;

}



export default function YouthBrandCard({

name,

program,

motto,

philosophy,

logo

}:YouthBrandCardProps){



return (

<Card

className="
relative
overflow-hidden
"

>


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

<div className="
text-4xl
font-bold
text-[#0C1A3D]
">

{name.charAt(0)}

</div>


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



<div className="mt-6">


<h3 className="
font-bold
text-[#0C1A3D]
">

Filosofia

</h3>


<p className="
mt-2
text-slate-600
">

{philosophy}

</p>


</div>


</Card>

);

}
