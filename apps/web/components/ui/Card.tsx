import React from "react";


interface CardProps {

children:React.ReactNode;

className?:string;

variant?:
"default"
|
"glass"
|
"interactive";

onClick?:()=>void;

}



export default function Card({

children,

className="",

variant="default",

onClick

}:CardProps){



const variants = {


default:
"bg-white rounded-2xl shadow-sm border border-slate-200",


glass:
"bg-white/70 backdrop-blur-xl rounded-3xl border border-white/30 shadow-lg",


interactive:
"bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg cursor-pointer transition"

};



return (

<div

onClick={onClick}

className={

`${variants[variant]} ${className}`

}

>

{children}

</div>

);

}
