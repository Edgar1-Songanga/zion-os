"use client";


interface OrganizationNode {

name:string;

type:string;

children?:OrganizationNode[];

}



const structure:OrganizationNode={

name:"Conferência Geral",

type:"Divisão Global",

children:[

{

name:"União Angola",

type:"União",

children:[

{

name:"Missão Norte Angola",

type:"Missão",

children:[

{

name:"Distrito Luanda",

type:"Distrito",

children:[

{

name:"Igreja Local Viana",

type:"Igreja"

}

]

}

]

}

]

}

]

};



function TreeNode({node}:{node:OrganizationNode}){


return (

<div className="ml-5 mt-4">


<div

className="
bg-white
rounded-xl
border
p-4
shadow-sm
"

>


<h3 className="font-bold">

{node.name}

</h3>


<p className="text-sm text-slate-500">

{node.type}

</p>


</div>



{node.children?.map((child)=>(


<TreeNode

key={child.name}

node={child}

/>


))}


</div>

);

}



export default function OrganizationTree(){


return (

<div>

<TreeNode node={structure}/>

</div>

);

}
