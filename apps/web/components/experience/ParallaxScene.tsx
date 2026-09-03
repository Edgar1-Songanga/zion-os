"use client";


interface ParallaxSceneProps {

children:React.ReactNode;

speed?:number;

}



export default function ParallaxScene({

children,

speed=0.15

}:ParallaxSceneProps){


return (

<div

className="
relative
overflow-hidden
"

>


<div

className="
absolute
inset-0
transition-transform
duration-1000
"

style={{

transform:

`translateY(${speed * -20}px)`

}}

>


{children}


</div>


</div>

);

}
