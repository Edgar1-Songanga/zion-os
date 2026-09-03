export type YouthThemeType =
"Aventureiros"
|
"Desbravadores"
|
"Embaixadores"
|
"Jovens Adventistas";



export interface YouthTheme {


name:string;

description:string;

background:string;

mood:string;

}



export const YOUTH_THEMES:YouthTheme[]=[


{

name:"Aventureiros",

description:
"Descoberta, família e crescimento.",

background:
"/images/themes/adventurers.jpg",

mood:
"Natureza e alegria"

},


{

name:"Desbravadores",

description:
"Aventura, liderança e serviço.",

background:
"/images/themes/pathfinders.jpg",

mood:
"Exploração e missão"

},


{

name:"Embaixadores",

description:
"Propósito e liderança jovem.",

background:
"/images/themes/ambassadors.jpg",

mood:
"Excelência e influência"

},


{

name:"Jovens Adventistas",

description:
"Missão e transformação.",

background:
"/images/themes/youth.jpg",

mood:
"Impacto global"

}

];
