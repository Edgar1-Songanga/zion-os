import SpiritualChat 
from "@/components/spiritual-chat/SpiritualChat";


export default function SpiritualChatPage(){


return (

<main
className="
min-h-screen
bg-slate-100
p-8
"
>


<h1
className="
text-4xl
font-bold
text-[#0C1A3D]
"
>
ZION Spiritual Assistant
</h1>


<p
className="
mt-3
text-slate-500
"
>
Your companion for Bible study and spiritual growth.
</p>



<div className="mt-10">

<SpiritualChat />

</div>



</main>

)

}
