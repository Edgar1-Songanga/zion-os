"use client";


interface StatCardProps {

label:string;

value:string;

description?:string;

icon?:React.ReactNode;

className?:string;

}



export default function StatCard({

label,

value,

description,

icon,

className=""

}:StatCardProps){


return (

<div

className={`
group
relative
overflow-hidden
rounded-[32px]
p-7
min-h-[220px]
bg-white/10
backdrop-blur-2xl
border
border-white/20
shadow-2xl
transition-all
duration-500
hover:-translate-y-2
hover:bg-white/15
${className}
`}

>


<div

className="
absolute
inset-0
bg-gradient-to-br
from-white/20
via-transparent
to-transparent
opacity-70
"

/>



<div

className="
absolute
-right-20
-top-20
h-40
w-40
rounded-full
bg-white/20
blur-3xl
group-hover:scale-150
transition-transform
duration-700
"

/>



<div

className="
relative
z-10
flex
flex-col
justify-between
h-full
"

>


{icon && (

<div

className="
text-3xl
mb-5
"

>

{icon}

</div>

)}



<p

className="
uppercase
tracking-[0.25em]
text-xs
text-white/60
"

>

{label}

</p>



<h3

className="
mt-4
text-5xl
font-bold
text-white
"

>

{value}

</h3>



{description && (

<p

className="
mt-5
text-sm
text-white/70
leading-relaxed
"

>

{description}

</p>

)}


</div>


</div>

);

}
