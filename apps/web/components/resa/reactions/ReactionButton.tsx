"use client";

import { ReactionType } from "@/types/resa";


interface ReactionButtonProps {

type: ReactionType;

count?: number;

onReact?: (type: ReactionType)=>void;

}


const reactionData = {

LIKE:{
label:"👍",
name:"Gostei"
},

AMEN:{
label:"🙌",
name:"Amém"
},

PRAY:{
label:"🙏",
name:"Oração"
},

LOVE:{
label:"❤️",
name:"Amor"
},

SUPPORT:{
label:"🤝",
name:"Apoio"
}

};


export default function ReactionButton({

type,

count = 0,

onReact

}:ReactionButtonProps){


const reaction = reactionData[type];


return (

<button

onClick={()=>onReact?.(type)}

className="
flex
items-center
gap-2
px-3
py-2
rounded-full
border
bg-white
hover:bg-gray-50
transition
"

>

<span>

{reaction.label}

</span>


<span className="text-sm">

{reaction.name}

</span>


{count > 0 && (

<span className="text-xs">

{count}

</span>

)}


</button>

);

}
