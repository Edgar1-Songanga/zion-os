"use client";


interface Result{

name:string;

type:string;

}



const results:Result[]=[

{

name:"Edgar Songanga",

type:"Pessoa"

},

{

name:"Igreja Adventista Central",

type:"Organização"

},

{

name:"Comunidade Jovem ZION",

type:"Comunidade"

}

];



export default function SearchResults(){


return (

<div

className="
space-y-4
"

>


{results.map((result)=>(


<div

key={result.name}

className="
bg-white
rounded-2xl
p-5
border
border-slate-200
shadow-sm
"

>


<div className="flex justify-between">


<h3 className="font-bold">

{result.name}

</h3>



<span

className="
text-sm
text-slate-500
"

>

{result.type}

</span>


</div>


</div>


))}


</div>

);

}
