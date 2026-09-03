import LanguageSelector
from "@/components/language/LanguageSelector";


export default function Topbar(){


return (

<header

className="
h-20
bg-white
border-b
flex
items-center
justify-between
px-8
"

>


<div>

<h2
className="
font-bold
text-xl
text-[#0C1A3D]
"
>
ZION OS
</h2>


<p
className="
text-sm
text-slate-500
"
>
Global Adventist Digital Ecosystem
</p>


</div>



<div
className="
flex
items-center
gap-4
"
>


<LanguageSelector />



<div
className="
w-10
h-10
rounded-full
bg-[#0C1A3D]
text-white
flex
items-center
justify-center
"
>
E
</div>



</div>



</header>

)

}
