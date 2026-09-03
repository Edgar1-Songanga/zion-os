"use client";

import { useState } from "react";


export default function NotificationBell(){


const [count,setCount]=useState(5);



return (

<button

onClick={()=>setCount(0)}

className="
relative
h-12
w-12
rounded-full
bg-white
border
border-slate-200
shadow-sm
flex
items-center
justify-center
"

>


<span className="text-xl">

🔔

</span>



{count > 0 && (

<span

className="
absolute
-top-1
-right-1
h-5
w-5
rounded-full
bg-red-500
text-white
text-xs
flex
items-center
justify-center
"

>

{count}

</span>

)}


</button>

);

}
