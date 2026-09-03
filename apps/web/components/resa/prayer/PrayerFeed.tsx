const prayers=[

{
name:"Maria",
text:"Peço oração pela minha família.",
count:24
},

{
name:"João",
text:"Preciso de força para uma nova fase.",
count:51
},

{
name:"Ana",
text:"Orem pelo meu ministério.",
count:18
}

];


export default function PrayerFeed(){


return (

<div
className="
space-y-5
"
>


{prayers.map(prayer=>(

<div
key={prayer.name}
className="
bg-white
rounded-3xl
p-6
border
"
>


<h3
className="
font-bold
text-[#0C1A3D]
"
>
{prayer.name}
</h3>


<p
className="
mt-3
text-slate-600
"
>
{prayer.text}
</p>


<button

className="
mt-5
bg-[#D4AF37]
px-5
py-2
rounded-full
text-[#0C1A3D]
font-semibold
"

>
🙏 Estou a orar ({prayer.count})
</button>


</div>

))}


</div>

)

}
