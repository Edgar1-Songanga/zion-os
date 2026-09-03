"use client";


import Card from "../../ui/Card";


interface Recommendation {


message:string;


priority:string;


}



interface Props {


participation:number;


serviceHours:number;


skillsCompleted:number;


spiritualActions:number;


recommendations:Recommendation[];


}



export default function YouthImpactPanel({

participation,

serviceHours,

skillsCompleted,

spiritualActions,

recommendations

}:Props){



return (

<Card>


<h2 className="
text-xl
font-bold
text-[#0C1A3D]
">

Impacto do Ministério

</h2>



<div className="
grid
md:grid-cols-4
gap-4
mt-6
">



<div>

<p className="text-sm text-slate-500">

Participação

</p>


<strong>

{participation}

</strong>

</div>



<div>

<p className="text-sm text-slate-500">

Horas de Serviço

</p>


<strong>

{serviceHours}

</strong>

</div>



<div>

<p className="text-sm text-slate-500">

Competências

</p>


<strong>

{skillsCompleted}

</strong>

</div>



<div>

<p className="text-sm text-slate-500">

Acções Espirituais

</p>


<strong>

{spiritualActions}

</strong>

</div>



</div>



<div className="mt-8">


<h3 className="
font-bold
">

Recomendações

</h3>



<div className="mt-3 space-y-3">


{

recommendations.map(

(item,index)=>(


<div

key={index}

className="
p-4
rounded-xl
bg-slate-50
"

>


<p>

{item.message}

</p>


<span className="
text-xs
text-slate-500
">

Prioridade: {item.priority}

</span>


</div>


)

)

}


</div>


</div>


</Card>

);

}
