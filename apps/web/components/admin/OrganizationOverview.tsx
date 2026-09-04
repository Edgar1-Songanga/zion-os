"use client";


const organizations = [

{
name:"General Conference",
value:"1",
description:"Global leadership structure"
},

{
name:"Divisions",
value:"13",
description:"Worldwide administrative regions"
},

{
name:"Unions",
value:"135",
description:"Regional coordination bodies"
},

{
name:"Conferences",
value:"700+",
description:"Local church networks"
}

];


export default function OrganizationOverview(){


return (

<section
className="
bg-white
rounded-3xl
border
border-slate-200
p-8
shadow-sm
"
>


<div
className="
mb-8
"
>

<h2
className="
text-2xl
font-semibold
text-[#0C1A3D]
"
>
Global Organization Structure
</h2>


<p
className="
mt-2
text-slate-500
"
>
Complete administrative vision of the Adventist global network.
</p>

</div>



<div
className="
grid
md:grid-cols-4
gap-6
"
>


{organizations.map(item=>(


<div
key={item.name}
className="
rounded-2xl
bg-slate-50
p-6
border
border-slate-100
"
>


<p
className="
text-sm
text-slate-500
"
>
{item.name}
</p>


<h3
className="
mt-3
text-3xl
font-bold
text-[#0C1A3D]
"
>
{item.value}
</h3>


<p
className="
mt-2
text-xs
text-slate-500
"
>
{item.description}
</p>


</div>


))}


</div>


</section>

);

}
