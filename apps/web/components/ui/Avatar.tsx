"use client";


interface AvatarProps {

src?:string;

name:string;

size?: "sm" | "md" | "lg";

verified?:boolean;

}



export default function Avatar({

src,

name,

size="md",

verified=false

}:AvatarProps){



const sizes={

sm:"w-10 h-10 text-sm",

md:"w-16 h-16 text-lg",

lg:"w-24 h-24 text-2xl"

};



return (

<div

className="
relative
inline-flex
items-center
justify-center
"

>


<div

className={`

${sizes[size]}

rounded-full

overflow-hidden

backdrop-blur-xl

bg-white/20

border

border-white/30

shadow-lg

flex

items-center

justify-center

font-bold

text-[#0C1A3D]

`}

>


{src ?

<img

src={src}

alt={name}

className="
w-full
h-full
object-cover
"

/>

:

name.charAt(0)

}


</div>



{verified && (

<div

className="
absolute
bottom-0
right-0
w-5
h-5
rounded-full
bg-blue-600
border-2
border-white
"

>

</div>

)}


</div>

);

}
