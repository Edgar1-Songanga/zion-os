"use client";


interface ClubLogoProps {


src?:string;

name:string;

size?: "sm" | "md" | "lg";

}



export default function ClubLogo({

src,

name,

size="md"

}:ClubLogoProps){



const sizes={

sm:"w-10 h-10",

md:"w-20 h-20",

lg:"w-36 h-36"

};



return (

<div

className={`

${sizes[size]}

rounded-3xl

bg-white/30

border

border-white/40

backdrop-blur-xl

flex

items-center

justify-center

overflow-hidden

`}

>


{src ?


<img

src={src}

alt={name}

className="
w-full
h-full
object-contain
"

/>


:


<span className="
text-3xl
font-bold
text-[#0C1A3D]
">

{name.charAt(0)}

</span>


}


</div>

);

}
