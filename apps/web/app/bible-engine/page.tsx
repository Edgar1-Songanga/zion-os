import BibleSearch 
from "@/components/bible-engine/BibleSearch";


import KnowledgeCards 
from "@/components/bible-engine/KnowledgeCards";


import BibleQuiz
from "@/components/bible-engine/quiz/BibleQuiz";



export default function BibleEngine(){


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
Bible Engine
</h1>


<p
className="
mt-3
text-slate-500
"
>
A structured spiritual knowledge platform.
</p>



<div className="mt-8">

<BibleSearch />

</div>



<KnowledgeCards />



<div className="mt-10">

<BibleQuiz />

</div>



</main>

)

}
