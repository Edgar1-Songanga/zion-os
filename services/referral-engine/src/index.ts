export interface Referral {

  id:string;

  inviterId:string;

  invitedId?:string;

  code:string;

  status:
  | "PENDING"
  | "COMPLETED";

}



export function createReferral(
memberId:string
):Referral{


return {

id:
crypto.randomUUID(),

inviterId:
memberId,

code:
"ZION-" +
memberId.substring(0,5)
.toUpperCase(),

status:
"PENDING"

};


}



export function completeReferral(
referral:Referral,
newMemberId:string
){


return {

...referral,

invitedId:newMemberId,

status:"COMPLETED"

};


}



export function referralReward(){

return {

event:
"REFERRAL_COMPLETED",

points:50

};

}
