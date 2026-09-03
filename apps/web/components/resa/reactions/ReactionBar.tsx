"use client";

import ReactionButton from "./ReactionButton";


export default function ReactionBar(){


const reactions = [

"LIKE",
"AMEN",
"PRAY",
"LOVE",
"SUPPORT"

] as const;


return (

<div className="
flex
gap-2
flex-wrap
">


{reactions.map((reaction)=>(

<ReactionButton

key={reaction}

type={reaction}

/>

))}


</div>

);

}
