export default function ActivityFeed(){

const activities = [

"Nova igreja registada no sistema",

"Novo grupo RESA criado",

"Relatório mensal submetido",

"Novo testemunho publicado",

"Novo membro integrado"

];


return (

<div
className="
bg-white
rounded-3xl
p-8
shadow-sm
border
border-slate-200
"
>

<h2
className="
text-xl
font-bold
text-[#0C1A3D]
"
>
Recent Activity
</h2>


<div className="mt-6 space-y-4">

{activities.map((item,index)=>(

<div
key={index}
className="
flex
items-center
gap-4
"
>

<div
className="
h-3
w-3
rounded-full
bg-[#D4AF37]
"
/>


<p
className="
text-slate-600
"
>
{item}
</p>


</div>

))}

</div>


</div>

)

}
