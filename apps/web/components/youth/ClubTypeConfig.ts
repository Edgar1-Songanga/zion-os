export type ClubType =
"Aventureiros"
|
"Desbravadores"
|
"Embaixadores"
|
"Jovens Adventistas";


export interface ClubTypeConfig {


name:string;

description:string;

philosophy:string;

ageRange:string;

classes:string[];

}


export const CLUB_TYPES:ClubTypeConfig[]=[


{

name:"Aventureiros",

description:
"Programa de desenvolvimento espiritual, familiar e pessoal para crianças.",

philosophy:
"Ajudar a criança a conhecer Jesus, desenvolver carácter e servir.",

ageRange:
"6-9 anos",

classes:[

"Abelhinha Laboriosa",

"Raio de Sol",

"Construtor",

"Mãos Ajudadoras"

]

},


{

name:"Desbravadores",

description:
"Programa de discipulado, liderança e serviço para juvenis.",

philosophy:
"Salvar do pecado e guiar no serviço.",

ageRange:
"10-15 anos",

classes:[

"Amigo",

"Companheiro",

"Pesquisador",

"Pioneiro",

"Excursionista",

"Guia"

]

},


{

name:"Embaixadores",

description:
"Programa de liderança e missão para adolescentes.",

philosophy:
"Preparar jovens para liderança espiritual e serviço.",

ageRange:
"16-21 anos",

classes:[

"Embaixador"

]

},


{

name:"Jovens Adventistas",

description:
"Ministério de jovens adultos focado em missão e liderança.",

philosophy:
"Ser discípulo de Cristo e influenciar o mundo.",

ageRange:
"16+ anos",

classes:[

"Líder Jovem"

]

}

];
