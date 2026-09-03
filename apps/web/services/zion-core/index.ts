export interface ZionEvent {

type:string;

userId?:string;

module:string;

data:any;

}



export function processZionEvent(
event:ZionEvent
){


switch(event.type){


case "PRAYER_CREATED":

return {

action:
"ADD_SPIRITUAL_POINTS",

points:10

};



case "BIBLE_STUDY_COMPLETED":

return {

action:
"ADD_SPIRITUAL_POINTS",

points:30

};



case "TESTIMONY_SHARED":

return {

action:
"ADD_REPUTATION",

points:20

};



default:

return {

action:
"NONE"

};


}


}
