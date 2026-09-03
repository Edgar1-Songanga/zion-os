export interface Language {

code:string;

name:string;

nativeName:string;

}



export const languages:Language[]=[


{
code:"pt",
name:"Portuguese",
nativeName:"Português"
},


{
code:"en",
name:"English",
nativeName:"English"
},


{
code:"es",
name:"Spanish",
nativeName:"Español"
},


{
code:"fr",
name:"French",
nativeName:"Français"
},


{
code:"de",
name:"German",
nativeName:"Deutsch"
},


{
code:"it",
name:"Italian",
nativeName:"Italiano"
},


{
code:"zh",
name:"Chinese",
nativeName:"中文"
},


{
code:"ar",
name:"Arabic",
nativeName:"العربية"
},


{
code:"sw",
name:"Swahili",
nativeName:"Kiswahili"
},


{
code:"os",
name:"Oshiwambo",
nativeName:"Oshiwambo"
},


{
code:"umb",
name:"Umbundu",
nativeName:"Umbundu"
},


{
code:"kmb",
name:"Kimbundu",
nativeName:"Kimbundu"
}


];



export function getLanguage(code:string){

return languages.find(
language =>
language.code===code
);

}
