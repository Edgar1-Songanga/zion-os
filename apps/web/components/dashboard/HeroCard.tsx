"use client";

import { getTheme } from "@/components/experience/ThemeEngine";


export default function HeroCard(){

const theme = getTheme("core");


return (

<section
className="
relative
overflow-hidden
rounded-[36px]
p-10
min-h-[320px]
backdrop-blur-xl
bg-white/10
border
border-white/20
shadow-2xl
text-white
"
>

<div
className="
absolute
inset-0
opacity-30
"
style={{
background:
`linear-gradient(135deg, ${theme.primary}, transparent)`
}}
/>


<div
className="
relative
z-10
max-w-3xl
"
>

<p
className="
text-sm
uppercase
tracking-[0.35em]
text-white/70
"
>
ZION OS
</p>


<h1
className="
mt-4
text-5xl
font-bold
leading-tight
"
>
Global Digital Ecosystem
</h1>


<p
className="
mt-5
text-lg
text-white/80
max-w-2xl
"
>
Conectando pessoas, igrejas e comunidades
através de uma plataforma digital de fé,
missão e crescimento.
</p>



<div
className="
mt-8
flex
gap-4
flex-wrap
"
>


<div
className="
px-5
py-3
rounded-2xl
bg-white/15
border
border-white/20
backdrop-blur-md
"
>
🌍 Global Community
</div>


<div
className="
px-5
py-3
rounded-2xl
bg-white/15
border
border-white/20
backdrop-blur-md
"
>
✦ Spiritual Growth
</div>


<div
className="
px-5
py-3
rounded-2xl
bg-white/15
border
border-white/20
backdrop-blur-md
"
>
∞ Connected Mission
</div>


</div>


</div>

</section>

);

}
