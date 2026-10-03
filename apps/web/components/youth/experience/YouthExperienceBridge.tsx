"use client";


import DynamicBackground from "../../experience/DynamicBackground";

import GlassPanel from "../../experience/GlassPanel";
import type { ZionTheme } from "../../experience/ThemeEngine";


interface YouthExperienceBridgeProps {


themeName: ZionTheme;


children:React.ReactNode;


}



export default function YouthExperienceBridge({

themeName,

children

}:YouthExperienceBridgeProps){



return (

<DynamicBackground

theme={themeName}

>


<GlassPanel>


{children}


</GlassPanel>


</DynamicBackground>

);

}
