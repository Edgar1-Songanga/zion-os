export type ZionEvent =
  | "USER_CREATED"
  | "POST_CREATED"
  | "COMMENT_CREATED"
  | "COMMUNITY_CREATED"
  | "EVENT_JOINED"
  | "REFERRAL_COMPLETED";


export interface AutomationAction {

  type:
  | "ADD_POINTS"
  | "CREATE_BADGE"
  | "SEND_NOTIFICATION";

  value?: number | string;

}



export interface AutomationRule {

  event: ZionEvent;

  action: AutomationAction;

}



export const rules: AutomationRule[] = [

{
event:"POST_CREATED",

action:{
type:"ADD_POINTS",
value:10
}

},


{
event:"COMMENT_CREATED",

action:{
type:"ADD_POINTS",
value:5
}

},


{
event:"COMMUNITY_CREATED",

action:{
type:"ADD_POINTS",
value:100
}

},


{
event:"REFERRAL_COMPLETED",

action:{
type:"ADD_POINTS",
value:50
}

}


];



export function processEvent(
event: ZionEvent
){

const matchedRules =
rules.filter(
rule=>rule.event===event
);



return matchedRules;

}
