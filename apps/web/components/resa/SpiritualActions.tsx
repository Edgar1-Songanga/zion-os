export default function SpiritualActions(){

const actions=[

"🙏 Oração",

"❤️ Inspirado",

"📖 Aprendi",

"🤝 Participar",

"🌱 Crescer"

];


return (

<div
className="
flex
gap-3
flex-wrap
mt-6
"
>

{actions.map(action=>(

<button

key={action}

className="
px-4
py-2
rounded-full
bg-slate-100
hover:bg-blue-100
transition
text-sm
"

>

{action}

</button>

))}


</div>

)

}
