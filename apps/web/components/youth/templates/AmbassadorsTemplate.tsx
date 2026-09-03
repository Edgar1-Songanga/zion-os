"use client";


import YouthIdentityShell from "../shell/YouthIdentityShell";

import YouthIdentityProfile from "../identity/YouthIdentityProfile";



interface AmbassadorsTemplateProps {


name:string;

logo?:string;

background?:string;

historyItems:any[];

}



export default function AmbassadorsTemplate({

name,

logo,

background,

historyItems

}:AmbassadorsTemplateProps){



return (

<YouthIdentityShell

themeName="Embaixadores"

>


<YouthIdentityProfile

name={name}

program="Embaixadores"

motto="Ser líder, servir e transformar"

description="

Programa de desenvolvimento de liderança,

discipulado e missão para adolescentes,

preparando jovens para influenciar positivamente

a sociedade.

"

logo={logo}

background={background}

historyItems={historyItems}

/>


</YouthIdentityShell>

);

}
