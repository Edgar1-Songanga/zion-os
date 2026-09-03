import {
spiritualResponses
}
from "./knowledge/responses";


export function spiritualChat(
message:string
){


const text =
message.toLowerCase();



const result =
spiritualResponses.find(item=>

item.keywords.some(keyword=>

text.includes(keyword)

)

);



if(!result){

return {

title:
"Pesquisa espiritual",

answer:
"Não encontrei uma resposta específica. Tente pesquisar por temas como oração, esperança, sábado ou Bíblia.",

references:[]

};

}



return result;


}
