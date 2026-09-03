"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {

const pathname = usePathname();


const sections = [

{
title:"CORE",
items:[
{
name:"Dashboard",
path:"/dashboard"
},
{
name:"RESA",
path:"/resa"
}
]
},

{
title:"SPIRITUAL EXPERIENCE",
items:[
{
name:"Bible Engine",
path:"/bible-engine"
},
{
name:"Communities",
path:"/communities"
},
{
name:"Spiritual Chat",
path:"/spiritual-chat"
}
]
},

{
title:"ORGANIZATION",
items:[
{
name:"Administration",
path:"/admin"
},
{
name:"Finance",
path:"/finance"
},
{
name:"Reports",
path:"/reports"
}
]
}

];


return (

<aside
className="
min-h-screen
w-80
bg-[#0C1A3D]
text-white
px-8
py-10
"
>


<div>

<h1
className="
text-4xl
font-semibold
tracking-wide
"
>
ZION
<span
className="
text-[#D4AF37]
"
>
OS
</span>

</h1>


<p
className="
mt-2
text-sm
text-slate-300
"
>
Global Digital Ecosystem
</p>

</div>



<div
className="
mt-10
rounded-3xl
bg-white/10
border
border-white/10
p-5
"
>

<p
className="
font-semibold
"
>
Edgar
</p>


<p
className="
text-sm
text-slate-300
mt-1
"
>
Global Administrator
</p>


</div>



<nav
className="
mt-10
"
>


{sections.map(section=>(

<div
key={section.title}
className="
mb-8
"
>


<p
className="
text-xs
tracking-widest
text-slate-400
mb-4
"
>
{section.title}
</p>



{section.items.map(item=>{


const active =
pathname===item.path;


return (

<Link

key={item.path}

href={item.path}

className={`
block
px-5
py-3
rounded-2xl
mb-2
transition-all
duration-300

${
active
?
"bg-[#D4AF37] text-[#0C1A3D] font-semibold shadow-lg"
:
"text-slate-200 hover:bg-white/10"
}

`}

>

{item.name}

</Link>

)

})}



</div>

))}


</nav>


</aside>

)

}
