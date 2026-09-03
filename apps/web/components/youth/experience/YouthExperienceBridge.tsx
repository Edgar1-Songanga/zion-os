"use client";


import DynamicBackground from "../../experience/DynamicBackground";

import GlassPanel from "../../experience/GlassPanel";


interface YouthExperienceBridgeProps {


themeName:string;


children:React.ReactNode;


}



export default function YouthExperienceBridge({

themeName,

children

}:YouthExperienceBridgeProps){



return (

<DynamicBackground

theme={themeName as any}

>


<GlassPanel>


{children}


</GlassPanel>


</DynamicBackground>

);

}
