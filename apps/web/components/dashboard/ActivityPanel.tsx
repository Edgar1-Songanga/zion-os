export default function ActivityPanel(){

const activities=[

"New church organization registered",

"500 members joined RESA",

"Monthly report submitted",

"Bible study completed"

];


return (

<div
className="
bg-white
rounded-3xl
p-8
border
border-slate-200
mt-8
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


<div
className="
mt-6
space-y-4
"
>

{activities.map(activity=>(

<div
key={activity}
className="
bg-slate-50
rounded-xl
p-4
"
>

{activity}

</div>

))}


</div>


</div>

)

}
