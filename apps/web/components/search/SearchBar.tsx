"use client";

import { useState } from "react";


export default function SearchBar(){

const [query,setQuery]=useState("");


function search(){

console.log("Searching:", query);

}


return (

<div
className="
bg-white
rounded-3xl
p-4
border
border-slate-200
shadow-sm
"
>

<div className="flex gap-3">

<input

value={query}

onChange={(e)=>setQuery(e.target.value)}

placeholder="Pesquisar no ZION..."

className="
flex-1
px-4
py-3
rounded-xl
border
outline-none
"

/>


<button

onClick={search}

className="
px-6
py-3
rounded-xl
bg-[#0C1A3D]
text-white
"

>

Pesquisar

</button>


</div>

</div>

);

}
