"use client";


import DynamicBackground from "@/components/experience/DynamicBackground";

import { ReactNode } from "react";


interface DashboardExperienceProps {

children:ReactNode;

}



export default function DashboardExperience({

children

}:DashboardExperienceProps){


return (

<DynamicBackground theme="core">


<div

className="min-h-screen p-4 sm:p-6 lg:p-8"

>

{children}

</div>


</DynamicBackground>

);

}
