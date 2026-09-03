import LanguageSwitcher from "@/components/language/LanguageSwitcher";


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
gap-5
"
>


<LanguageSwitcher />


<div
className="
rounded-full
bg-[#0C1A3D]
text-white
px-5
py-2
"
>
Edgar
</div>


</div>


</header>

)

}
