"use client";


import YouthExperienceBridge from "../experience/YouthExperienceBridge";
import type { ZionTheme } from "../../experience/ThemeEngine";



interface YouthIdentityShellProps {


themeName: ZionTheme;

children:React.ReactNode;

}



export default function YouthIdentityShell({

themeName,

children

}:YouthIdentityShellProps){



return (

<YouthExperienceBridge

themeName={themeName}

>


<div className="
min-h-screen
p-6
md:p-10
">


{children}


</div>


</YouthExperienceBridge>

);

}
