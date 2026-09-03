"use client";


interface Badge {

name:string;

icon:string;

}



const badges:Badge[]=[

{

name:"Pastor",

icon:"🙏"

},

{

name:"Figura Pública",

icon:"⭐"

},

{

name:"Criador",

icon:"🎥"

},

{

name:"Fundador",

icon:"👑"

}

];



export default function ZionBadges(){


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

Badges ZION

</h2>



<div className="mt-5 flex flex-wrap gap-3">


{badges.map((badge)=>(


<div

key={badge.name}

className="
px-4
py-3
rounded-full
bg-slate-50
flex
items-center
gap-2
"

>


<span>

{badge.icon}

</span>


<span className="font-medium">

{badge.name}

</span>


</div>


))}


</div>


</div>

);

}
