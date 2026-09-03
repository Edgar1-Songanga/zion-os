"use client";


import YouthIdentityShell from "../shell/YouthIdentityShell";

import YouthIdentityProfile from "../identity/YouthIdentityProfile";



interface PathfindersTemplateProps {


name:string;

logo?:string;

background?:string;

historyItems:any[];

}



export default function PathfindersTemplate({

name,

logo,

background,

historyItems

}:PathfindersTemplateProps){



return (

<YouthIdentityShell

themeName="Desbravadores"

>


<YouthIdentityProfile

name={name}

program="Desbravadores"

motto="Salvar do pecado e guiar no serviço"

description="

Programa de discipulado, liderança,

desenvolvimento de carácter e serviço

para juvenis e adolescentes.

"

logo={logo}

background={background}

historyItems={historyItems}

/>


</YouthIdentityShell>

);

}
