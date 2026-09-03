"use client";

import { useState } from "react";

import { bibleQuestions } 
from "@/data/bible/questions";


export default function BibleQuiz(){


const [index,setIndex]=useState(0);

const [score,setScore]=useState(0);


const question=bibleQuestions[index];


function answer(option:string){


if(option===question.answer){

setScore(
score + question.points
);

}


if(index < bibleQuestions.length-1){

setIndex(index+1);

}


}



return (

<div
className="
bg-white
rounded-3xl
p-8
border
shadow
"
>


<h2
className="
text-2xl
font-bold
text-[#0C1A3D]
"
>
Bible Challenge
</h2>



<p
className="
mt-6
text-lg
font-semibold
"
>
{question.question}
</p>



<div
className="
mt-5
space-y-3
"
>

{

question.options.map(option=>(


<button

key={option}

onClick={()=>answer(option)}

className="
w-full
text-left
p-4
rounded-xl
bg-slate-100
hover:bg-blue-100
"

>

{option}

</button>


))

}


</div>



<p
className="
mt-6
font-bold
text-[#D4AF37]
"
>
ZION Points: {score}
</p>



</div>

)

}
