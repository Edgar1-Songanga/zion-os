export interface KnowledgeItem {


id:string;


title:string;


content:string;


references:string[];


type:string;


}



const knowledgeBase:KnowledgeItem[] = [


{

id:"bible-sabbath",

title:"O Sábado",

content:
"O Sábado é o sétimo dia da semana, estabelecido por Deus na criação e apresentado nas Escrituras como um dia de descanso e comunhão com Deus.",

references:[
"Génesis 2:2-3",
"Êxodo 20:8-11"
],

type:"doctrine"

},


{

id:"bible-prayer",

title:"Oração",

content:
"A oração é uma comunicação pessoal entre o ser humano e Deus, expressando louvor, gratidão, confissão e pedidos.",

references:[
"Mateus 6:9-13"
],

type:"spiritual"

}

];



export function searchKnowledge(

query:string

){


const text=query.toLowerCase();



return knowledgeBase.find(

(item)=>

item.title
.toLowerCase()
.includes(text)

||

item.content
.toLowerCase()
.includes(text)

);

}
