"use client";


interface ModalProps {

open:boolean;

title:string;

children:React.ReactNode;

onClose:()=>void;

}



export default function Modal({

open,

title,

children,

onClose

}:ModalProps){


if(!open) return null;



return (

<div

className="
fixed
inset-0
z-50
flex
items-center
justify-center
bg-black/50
backdrop-blur-sm
"

>


<div

className="
relative
w-full
max-w-lg
rounded-[32px]
backdrop-blur-2xl
bg-white/20
border
border-white/30
shadow-2xl
p-8
"

>


<button

onClick={onClose}

className="
absolute
top-4
right-5
text-slate-500
text-xl
"

>

×


</button>



<h2

className="
text-2xl
font-bold
text-[#0C1A3D]
"

>

{title}

</h2>



<div

className="
mt-6
"

>

{children}

</div>


</div>


</div>

);

}
