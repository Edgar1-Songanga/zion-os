"use client";

import { useState } from "react";


export default function BibleSearch(){

const [query,setQuery]=useState("");


return (

<div
className="
bg-white
rounded-3xl
p-8
shadow
border
"
>


<h2
className="
text-2xl
font-bold
text-[#0C1A3D]
"
>
Search Knowledge
</h2>


<p
className="
mt-2
text-slate-500
"
>
Explore the Bible, beliefs and church knowledge.
</p>



<input

value={query}

onChange={
e=>setQuery(e.target.value)
}

placeholder="Search Bible topics..."

className="
mt-6
w-full
rounded-xl
border
p-4
"

/>



{
query && (

<div
className="
mt-5
bg-slate-50
rounded-xl
p-5
"
>


<p
className="
font-bold
"
>
Results for:
</p>


<p className="mt-2">
{query}
</p>


</div>

)

}


</div>

)

}
