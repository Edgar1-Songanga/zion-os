"use client";


import YouthIdentityShell from "../shell/YouthIdentityShell";

import YouthIdentityProfile from "../identity/YouthIdentityProfile";



interface AdventurersTemplateProps {


name:string;

logo?:string;

background?:string;

historyItems: Array<{ year: string; title: string; description: string }>;

}



export default function AdventurersTemplate({

name,

logo,

background,

historyItems

}:AdventurersTemplateProps){



return (

<YouthIdentityShell

themeName="youth"

>


<YouthIdentityProfile

name={name}

program="Aventureiros"

motto="Jesus me ama"

description="
Programa de desenvolvimento espiritual,
familiar e pessoal para crianças,
ajudando-as a conhecer Jesus e servir.
"

logo={logo}

background={background}

historyItems={historyItems}

/>


</YouthIdentityShell>

);

}
