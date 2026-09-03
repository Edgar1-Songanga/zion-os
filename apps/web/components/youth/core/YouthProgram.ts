export interface YouthProgram {


id:string;


name:string;


description:string;


ageRange:string;


philosophy:string;


features:string[];


}



export const YOUTH_PROGRAMS:YouthProgram[]=[



{


id:"adventurers",


name:"Aventureiros",


description:
"Programa de crescimento espiritual e desenvolvimento infantil.",


ageRange:
"6-9 anos",


philosophy:
"Ensinar crianças a conhecer Jesus, amar a família e servir.",


features:[

"Classes",

"Actividades familiares",

"Descoberta espiritual"

]


},



{


id:"pathfinders",


name:"Desbravadores",


description:
"Programa de formação de carácter, liderança e serviço.",


ageRange:
"10-15 anos",


philosophy:
"Salvar do pecado e guiar no serviço.",


features:[

"Classes",

"Especialidades",

"Acampamentos",

"Investiduras"

]


},



{


id:"ambassadors",


name:"Embaixadores",


description:
"Formação de jovens líderes comprometidos com a missão.",


ageRange:
"16-21 anos",


philosophy:
"Desenvolver liderança e influência positiva.",


features:[

"Liderança",

"Mentoria",

"Serviço"

]


},



{


id:"youth",


name:"Jovens Adventistas",


description:
"Comunidade jovem focada em comunhão e missão.",


ageRange:
"16+ anos",


philosophy:
"Juventude com propósito e impacto.",


features:[

"Evangelismo",

"Projectos",

"Comunidade"

]


}


];
