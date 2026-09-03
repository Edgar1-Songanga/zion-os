export default function Badges(){

const badges=[

"🏅 Community Builder",

"📖 Bible Student",

"🙏 Prayer Leader",

"🌍 Global Connector"

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
Achievements
</h2>


<div
className="
flex
gap-3
flex-wrap
mt-6
"
>


{badges.map(badge=>(

<span
key={badge}
className="
px-4
py-2
rounded-full
bg-[#D4AF37]/20
text-sm
"
>

{badge}

</span>

))}


</div>


</div>

)

}
