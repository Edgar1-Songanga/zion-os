"use client";


import Card from "../ui/Card";

import Badge from "../ui/Badge";



interface InvestitureRecordProps {


member:string;

program:string;

level:string;

date:string;

leader:string;

status?:string;

}



export default function InvestitureRecord({

member,

program,

level,

date,

leader,

status="CONFIRMED"

}:InvestitureRecordProps){



return (

<Card>


<div className="
flex
justify-between
items-start
">


<div>


<h2 className="
text-2xl
font-bold
text-[#0C1A3D]
">

{member}

</h2>


<p className="
text-slate-500
mt-2
">

{program}

</p>


</div>



<Badge

label={status}

type="success"

/>


</div>



<div className="
mt-6
space-y-3
">


<p>

<strong>Classe:</strong> {level}

</p>


<p>

<strong>Data:</strong> {date}

</p>


<p>

<strong>Responsável:</strong> {leader}

</p>


</div>


</Card>

);

}
