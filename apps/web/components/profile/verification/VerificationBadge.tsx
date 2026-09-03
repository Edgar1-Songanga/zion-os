"use client";


interface VerificationBadgeProps {

type:string;

}



export default function VerificationBadge({

type

}:VerificationBadgeProps){


return (

<div

className="
inline-flex
items-center
gap-2
px-4
py-2
rounded-full
bg-blue-50
text-blue-700
font-medium
"

>


<span>

✓

</span>


<span>

{type}

</span>


</div>

);

}
