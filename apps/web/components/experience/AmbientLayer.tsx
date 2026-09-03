"use client";


interface AmbientLayerProps {

color?:string;

intensity?:number;

}



export default function AmbientLayer({

color="#D4AF37",

intensity=0.25

}:AmbientLayerProps){


return (

<div

className="
absolute
inset-0
pointer-events-none
overflow-hidden
"

>


<div

className="
absolute
w-[500px]
h-[500px]
rounded-full
blur-[120px]
animate-pulse
"

style={{

background:color,

opacity:intensity,

top:"-150px",

right:"-150px"

}}

/>



<div

className="
absolute
w-[400px]
h-[400px]
rounded-full
blur-[100px]
animate-pulse
"

style={{

background:color,

opacity:intensity/2,

bottom:"-100px",

left:"-100px"

}}

/>


</div>

);

}
