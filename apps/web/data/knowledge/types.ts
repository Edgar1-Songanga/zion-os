export interface KnowledgeItem {

id:string;

title:string;

category:
"Bible"
|
"Belief"
|
"Church"
|
"Statement"
|
"Study";


language:string;


content:string;


references:string[];

}
