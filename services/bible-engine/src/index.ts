export interface KnowledgeItem {


id:string;

title:string;

category:
"Bible"
|
"Belief"
|
"Church Manual"
|
"Statement"
|
"Study";


language:string;


content:string;


references?:string[];


}



export const knowledgeBase:KnowledgeItem[]=[


{

id:"belief-22",

title:"The Biblical Gift of Prophecy",

category:"Belief",

language:"en",

content:
"The prophetic gift is one of the gifts of the Holy Spirit.",

references:[
"Joel 2:28",
"Acts 2:17"
]

},


{

id:"belief-20",

title:"The Sabbath",

category:"Belief",

language:"en",

content:
"The Sabbath is the seventh day of the week and a memorial of creation.",

references:[
"Genesis 2:2-3",
"Exodus 20:8-11"
]

}


];



export function searchKnowledge(
query:string
){


return knowledgeBase.filter(

item =>
item.title
.toLowerCase()
.includes(
query.toLowerCase()
)

);


}
