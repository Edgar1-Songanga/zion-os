"use client";


import {

getIdentity,

ZionIdentity

} from "./ImageIdentitySystem";



import {

getTheme,

ZionTheme

} from "./ThemeEngine";




interface DynamicBackgroundProps {

theme:ZionTheme;

children:React.ReactNode;

}




export default function DynamicBackground({

theme,

children

}:DynamicBackgroundProps){


const themeConfig=getTheme(theme);

const identity=getIdentity(theme);



const backgroundImage=

identity.images[0];



return (

<div

className="
relative
min-h-screen
overflow-hidden
"

>


{/* Background Image */}

<div

className="
absolute
inset-0
bg-cover
bg-center
scale-105
transition-transform
duration-[4000ms]
"

style={{

backgroundImage:

`url(${backgroundImage})`

}}

/>



{/* Premium Overlay */}

<div

className="
absolute
inset-0
bg-gradient-to-b
from-black/40
via-black/20
to-black/70
"

/>



{/* Ambient Color */}

<div

className="
absolute
inset-0
opacity-20
"

style={{

background:

`radial-gradient(circle, ${themeConfig.primary}, transparent 60%)`

}}

/>



{/* Content */}

<div

className="
relative
z-10
"

>

{children}

</div>


</div>

);

}
