export interface MemberScore {

  memberId:string;

  points:number;

}



export interface Badge {

  name:string;

  requiredPoints:number;

}



export const badges:Badge[]=[


{
name:"🌱 New Member",
requiredPoints:100
},


{
name:"📖 Bible Student",
requiredPoints:1000
},


{
name:"🤝 Community Builder",
requiredPoints:5000
},


{
name:"🌍 Global Connector",
requiredPoints:20000
},


{
name:"🏅 ZION Ambassador",
requiredPoints:50000
}


];



export function calculateLevel(points:number){


if(points < 1000)
return "Level 1 - Explorer";


if(points < 5000)
return "Level 2 - Learner";


if(points < 20000)
return "Level 3 - Builder";


if(points < 50000)
return "Level 4 - Leader";


return "Level 5 - Ambassador";


}



export function getBadges(points:number){


return badges.filter(

badge =>
points >= badge.requiredPoints

);


}



export function addPoints(

currentPoints:number,

pointsToAdd:number

){


return currentPoints + pointsToAdd;


}
