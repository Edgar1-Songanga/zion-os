"use client";


import ClubLogo from "./ClubLogo";



interface ClubBannerProps {


clubName:string;

program:string;

motto:string;

background?:string;

logo?:string;

}



export default function ClubBanner({

clubName,

program,

motto,

background,

logo

}:ClubBannerProps){



return (

<div

className="
relative
h-96
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
bg-black/30
backdrop-blur-[2px]
"/>



<div className="
relative
z-10
h-full
flex
flex-col
items-center
justify-center
text-center
px-6
">


<ClubLogo

src={logo}

name={clubName}

size="lg"

/>



<h1 className="
mt-6
text-4xl
font-bold
text-white
">

{clubName}

</h1>



<p className="
mt-3
text-white/80
text-lg
">

{program}

</p>



<p className="
mt-4
italic
text-white
">

"{motto}"

</p>


</div>


</div>

);

}
