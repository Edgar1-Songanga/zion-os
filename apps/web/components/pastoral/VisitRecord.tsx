"use client";


interface VisitRecordProps {

visitor:string;

family:string;

date:string;

notes:string;

}



export default function VisitRecord({

visitor,

family,

date,

notes

}:VisitRecordProps){


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


<h3 className="text-xl font-bold">

Visita Pastoral

</h3>



<div className="mt-5 space-y-3">


<p>

👤 Visitante: <strong>{visitor}</strong>

</p>


<p>

👨‍👩‍👧 Família: <strong>{family}</strong>

</p>


<p>

📅 Data: <strong>{date}</strong>

</p>


<p>

📝 {notes}

</p>


</div>



<button

className="
mt-5
px-5
py-2
rounded-full
bg-[#0C1A3D]
text-white
"

>

Ver Detalhes

</button>


</div>

);

}
