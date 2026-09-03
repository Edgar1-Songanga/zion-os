import {

YouthAchievement

} from "./YouthAchievement";



class YouthProgressService {



private achievements:YouthAchievement[]=[];



addAchievement(

achievement:YouthAchievement

){


this.achievements.push(achievement);


return achievement;

}



getMemberAchievements(

memberId:string

){


return this.achievements.filter(

(item)=>

item.memberId === memberId

);

}



getProgramAchievements(

programId:string

){


return this.achievements.filter(

(item)=>

item.programId === programId

);

}



verifyAchievement(

id:string,

verifiedBy:string

){



const achievement =

this.achievements.find(

(item)=>

item.id === id

);



if(!achievement){

return null;

}



achievement.verified=true;

achievement.verifiedBy=verifiedBy;



return achievement;

}



getProgressSummary(

memberId:string

){


const items =

this.getMemberAchievements(memberId);



return {


total:items.length,


verified:

items.filter(

(item)=>

item.verified

).length


};


}



}



export default new YouthProgressService();
