import {
searchKnowledge
}
from "@/data/knowledge";



export function spiritualSearch(
question:string
){


const result =
searchKnowledge(question);



if(result){

return {

title:
result.title,

answer:
result.content,

references:
result.references,

type:
result.type

};

}



return {

title:
"Pesquisa espiritual",

answer:
"Não encontrei uma resposta específica na nossa base de conhecimento. Tente outro tema bíblico.",

references:[],

type:""

};


}
