"use client";


interface RankingUser {

id:string;

name:string;

points:number;

role:string;

}



const ranking:RankingUser[]=[

{

id:"1",

name:"Edgar Songanga",

points:9500,

role:"Fundador"

},

{

id:"2",

name:"Maria Silva",

points:7200,

role:"Líder de Comunidade"

},

{

id:"3",

name:"João Manuel",

points:5400,

role:"Membro Activo"

}

];



export default function Leaderboard(){


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

Ranking ZION

</h2>



<div className="mt-5 space-y-3">


{ranking.map((user,index)=>(


<div

key={user.id}

className="
flex
justify-between
items-center
bg-slate-50
rounded-xl
p-4
"

>


<div className="flex gap-3">


<span className="font-bold">

#{index+1}

</span>


<div>

<p className="font-semibold">

{user.name}

</p>


<p className="text-sm text-slate-500">

{user.role}

</p>


</div>


</div>



<span className="font-bold">

{user.points}

</span>


</div>


))}


</div>


</div>

);

}
