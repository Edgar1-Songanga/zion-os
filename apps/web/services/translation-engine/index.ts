export type Language =

"pt" |
"en" |
"es" |
"fr" |
"de" |
"it" |
"zh" |
"ar" |
"sw" |
"af" |
"osh" |
"umb" |
"kmb" |
"ln" |
"am" |
"yo" |
"ha" |
"zu" |
"xh";



export interface TranslationContent {

pt:string;

en:string;

es:string;

fr:string;

de:string;

it:string;

zh:string;

ar:string;

sw:string;

af:string;

osh:string;

umb:string;

kmb:string;

ln:string;

am:string;

yo:string;

ha:string;

zu:string;

xh:string;

}



export const languages = [


{
code:"pt",
name:"Português",
region:"Global"
},


{
code:"en",
name:"English",
region:"Global"
},


{
code:"es",
name:"Español",
region:"Global"
},


{
code:"fr",
name:"Français",
region:"Global"
},


{
code:"de",
name:"Deutsch",
region:"Global"
},


{
code:"it",
name:"Italiano",
region:"Global"
},


{
code:"zh",
name:"中文",
region:"Global"
},


{
code:"ar",
name:"العربية",
region:"Global"
},



{
code:"sw",
name:"Kiswahili",
region:"Africa"
},


{
code:"af",
name:"Afrikaans",
region:"Africa"
},


{
code:"osh",
name:"Oshiwambo",
region:"Africa"
},


{
code:"umb",
name:"Umbundu",
region:"Africa"
},


{
code:"kmb",
name:"Kimbundu",
region:"Africa"
},


{
code:"ln",
name:"Lingala",
region:"Africa"
},


{
code:"am",
name:"Amharic",
region:"Africa"
},


{
code:"yo",
name:"Yoruba",
region:"Africa"
},


{
code:"ha",
name:"Hausa",
region:"Africa"
},


{
code:"zu",
name:"Zulu",
region:"Africa"
},


{
code:"xh",
name:"Xhosa",
region:"Africa"
}


];



export function translateContent(

content:TranslationContent,

language:Language

){


return content[language] || content.pt;


}
