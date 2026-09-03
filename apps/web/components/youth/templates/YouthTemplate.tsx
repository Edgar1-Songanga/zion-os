"use client";


import YouthIdentityShell from "../shell/YouthIdentityShell";

import YouthIdentityProfile from "../identity/YouthIdentityProfile";



interface YouthTemplateProps {


name:string;

logo?:string;

background?:string;

historyItems:any[];

}



export default function YouthTemplate({

name,

logo,

background,

historyItems

}:YouthTemplateProps){



return (

<YouthIdentityShell

themeName="Jovens Adventistas"

>


<YouthIdentityProfile

name={name}

program="Jovens Adventistas"

motto="Juventude com propósito e missão"

description="

Ministério dedicado ao crescimento espiritual,

liderança, comunhão, serviço e missão,

preparando jovens para serem discípulos de Cristo.

"

logo={logo}

background={background}

historyItems={historyItems}

/>


</YouthIdentityShell>

);

}
