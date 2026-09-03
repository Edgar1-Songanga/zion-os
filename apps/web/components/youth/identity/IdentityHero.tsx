"use client";


import ClubLogo from "./ClubLogo";



interface IdentityHeroProps {


name:string;

program:string;

motto:string;

background?:string;

logo?:string;

description:string;

}



export default function IdentityHero({

name,

program,

motto,

background,

logo,

description

}:IdentityHeroProps){



return (

<section

className="
relative
min-h-[500px]
rounded-3xl
overflow-hidden
border
border-white/20
"

style={{

backgroundImage:

background

?

`url(${background})`

:

undefined,

backgroundSize:"cover",

backgroundPosition:"center"

}}

>


<div className="
absolute
inset-0
bg-gradient-to-b
from-black/40
to-black/70
"/>



<div className="
relative
z-10
min-h-[500px]
flex
flex-col
items-center
justify-center
text-center
px-8
">


<div className="
backdrop-blur-xl
bg-white/10
border
border-white/20
rounded-3xl
p-8
max-w-3xl
">


<ClubLogo

src={logo}

name={name}

size="lg"

/>



<h1 className="
mt-6
text-5xl
font-bold
text-white
">

{name}

</h1>



<p className="
mt-3
text-xl
text-white/80
">

{program}

</p>



<p className="
mt-5
italic
text-white
">

"{motto}"

</p>



<p className="
mt-6
text-white/70
leading-relaxed
">

{description}

</p>


</div>


</div>


</section>

);

}
