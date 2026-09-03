"use client";


interface BadgeProps {

label:string;

type?:

"gold"

|

"silver"

|

"blue"

|

"success";

className?:string;

}



export default function Badge({

label,

type="blue",

className=""

}:BadgeProps){



const styles={


gold:

`

bg-gradient-to-r

from-yellow-400

to-yellow-600

text-white

`,


silver:

`

bg-gradient-to-r

from-slate-300

to-slate-500

text-white

`,


blue:

`

bg-gradient-to-r

from-blue-500

to-blue-700

text-white

`,


success:

`

bg-gradient-to-r

from-emerald-500

to-emerald-700

text-white

`


};



return (

<span

className={`

inline-flex

items-center

px-4

py-1.5

rounded-full

text-xs

font-semibold

tracking-wide

shadow-md

${styles[type]}

${className}

`}

>


{label}


</span>

);

}
