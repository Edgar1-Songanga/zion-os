"use client";


import {

ZionTheme,

getTheme

} from "./ThemeEngine";



interface GlassPanelProps {

children:React.ReactNode;

theme?:ZionTheme;

className?:string;

}



export default function GlassPanel({

children,

theme="core",

className=""

}:GlassPanelProps){



const themeConfig=getTheme(theme);



return (

<div

className={`
relative
overflow-hidden
rounded-[32px]
backdrop-blur-2xl
bg-white/10
border
border-white/20
shadow-2xl
transition-all
duration-500
hover:scale-[1.01]

${className}

`}

>


{/* Ambient Glow */}

<div

className="
absolute
inset-0
opacity-30
pointer-events-none
"

style={{

background:

`radial-gradient(circle at top left, ${themeConfig.secondary}, transparent 45%)`

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
