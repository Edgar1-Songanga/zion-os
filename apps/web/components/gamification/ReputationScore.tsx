"use client";


interface ReputationScoreProps {

score:number;

level:string;

}



export default function ReputationScore({

score,

level

}:ReputationScoreProps){


return (

<div

className="
bg-white
rounded-3xl
p-6
border
border-slate-200
shadow-sm
"

>


<h2 className="text-xl font-bold">

Reputação ZION

</h2>



<div className="mt-5">


<p className="text-sm text-slate-500">

Pontuação

</p>


<p className="text-4xl font-bold text-[#0C1A3D]">

{score}

</p>


</div>



<div className="mt-4">


<span

className="
px-4
py-2
rounded-full
bg-yellow-50
text-yellow-700
"

>

⭐ {level}

</span>


</div>


</div>

);

}
