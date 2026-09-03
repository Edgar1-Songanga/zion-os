"use client";

import LanguageSelector from "@/components/language/LanguageSelector";


export default function Topbar(){


return (

<header

className="
h-24
bg-white
border-b
border-slate-200
px-10
flex
items-center
justify-between
"

>


<div>

<h2
className="
text-2xl
font-semibold
text-[#0C1A3D]
tracking-wide
"
>
ZION OS
</h2>


<p
className="
text-sm
text-slate-500
mt-1
"
>
Global Adventist Digital Ecosystem
</p>


</div>




<div

className="
flex
items-center
gap-6
"

>


<LanguageSelector />



<div

className="
flex
items-center
gap-4
"

>


<div

className="
h-12
w-12
rounded-full
bg-[#0C1A3D]
flex
items-center
justify-center
text-white
font-semibold
"

>
E
</div>


<div>

<p
className="
text-sm
font-semibold
text-[#0C1A3D]
"
>
Edgar
</p>


<p
className="
text-xs
text-slate-500
"
>
Administrator
</p>


</div>


</div>


</div>


</header>

)

}
